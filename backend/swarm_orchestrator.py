"""Lean, stateless swarm orchestrator.

Deliberately not a graph framework (see CLAUDE.md principle #1): a single
async generator drives four stages - vision extraction, a parallel debate
fan-out/fan-in over asyncio.gather, synthesis, and a memory write - yielding
typed DebateEvents as each stage completes so `main.py` can stream them
straight over SSE.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Protocol

from agents.prompts import (
    ARTHUR_SYSTEM_PROMPT,
    CLARA_SYSTEM_PROMPT,
    LEO_SYSTEM_PROMPT,
    PERSONA_SYSTEM_PROMPT,
    SYNTHESIZER_SYSTEM_PROMPT,
    TEXT_EXTRACT_SYSTEM_PROMPT,
    USER_STYLE_SYSTEM_PROMPT,
    build_debate_user_prompt,
    build_persona_user_prompt,
    build_rebuttal_user_prompt,
    build_synthesis_user_prompt,
    build_text_extract_user_prompt,
    build_user_style_user_prompt,
    resolve_response_language,
)
from llm_clients.base import LLMClient
from models.schemas import (
    AgentName,
    AgentOpinion,
    ConversationContext,
    DebateEvent,
    MemoryRecord,
    SocialMode,
    SupportedLanguage,
    SynthesisResult,
)
from text_utils import cap_sentences, split_headline_and_detail

logger = logging.getLogger(__name__)

_DEBATE_AGENTS: tuple[tuple[AgentName, str], ...] = (
    ("arthur", ARTHUR_SYSTEM_PROMPT),
    ("clara", CLARA_SYSTEM_PROMPT),
    ("leo", LEO_SYSTEM_PROMPT),
)

_SENTINEL = object()


class MemoryStoreProtocol(Protocol):
    """Structural type for the memory dependency - see memory/store.py.

    Every method takes `device_id` first - a client-generated, persisted
    identifier (see main.py::get_device_id) that scopes all memory to the
    device that created it, since this app has no auth system. Without it,
    two different people's contacts/history/style collide into the same
    global rows - see main.py's docstring on get_device_id for the incident
    this fixes."""

    async def get_contact_history(self, device_id: str, contact_id: str) -> list[MemoryRecord]: ...

    async def upsert_interaction(self, device_id: str, contact_id: str, result: SynthesisResult) -> None: ...

    async def get_persona(self, device_id: str, contact_id: str) -> str | None: ...

    async def upsert_persona(self, device_id: str, contact_id: str, persona: str) -> None: ...

    async def get_read_count(self, device_id: str, contact_id: str) -> int: ...

    # Per-device (not per-contact): the app's own user's texting voice, learned
    # from his "user"-sender messages across every read regardless of which
    # contact - but still scoped to the device, not global across all users.
    async def get_user_style(self, device_id: str) -> str | None: ...

    async def upsert_user_style(self, device_id: str, style: str) -> None: ...


class SwarmOrchestrator:
    def __init__(
        self,
        vision_client: LLMClient,
        debate_client: LLMClient,
        memory_store: MemoryStoreProtocol,
    ) -> None:
        self._vision_client = vision_client
        self._debate_client = debate_client
        self._memory_store = memory_store

    async def run_pipeline(
        self,
        images: list[tuple[bytes, str]] | None,
        contact_id: str | None,
        device_id: str,
        language: SupportedLanguage = "auto",
        mode: SocialMode = "hype",
        text_content: str | None = None,
    ) -> AsyncIterator[DebateEvent]:
        """`images` is one or more (image_bytes, mime_type) pairs - multiple
        screenshots of the same conversation (e.g. from scrolling) are merged
        into one ConversationContext during extraction, not analyzed separately.
        At least one of `images` or `text_content` must be given.

        `text_content` is copy-pasted/typed conversation text. If given without
        images, it IS the conversation and is parsed into a ConversationContext
        the same way a screenshot would be (see _extract_text_context). If given
        alongside images, it's treated as the user's own free-text commentary on
        top of the screenshot(s) and attached as ConversationContext.scenario_notes
        instead of being parsed as dialogue.

        `device_id` scopes every memory read/write below to the device that
        sent the request (see main.py::get_device_id) - required, not optional,
        since this app has no auth and memory would otherwise leak across users.

        Yields DebateEvents for each stage; any failure anywhere in the pipeline
        (provider timeout, rate limit, bad key) is caught and turned into one final
        `error` event instead of an unhandled exception, which would otherwise kill
        the SSE stream as a raw dropped connection - the client has no way to
        distinguish that from a network blip. Confirmed live: a mid-debate Groq
        rate-limit error used to abort the HTTP response with no signal at all."""
        try:
            yield DebateEvent(type="extraction_started")
            context = await self._extract_context(images, contact_id, text_content)
            yield DebateEvent(type="extraction_done", payload=context.model_dump(mode="json"))

            # Resolved once, after extraction sees the screenshot: an explicit user
            # preference forces this language; "auto" follows whatever the screenshot's
            # conversation is actually written in (falls back to English if undetected).
            response_language = resolve_response_language(language, context.detected_language)

            memory: list[MemoryRecord] = []
            persona: str | None = None
            if contact_id:
                memory = await self._memory_store.get_contact_history(device_id, contact_id)
                persona = await self._memory_store.get_persona(device_id, contact_id)

            # Per-device, independent of contact_id: how the app's own user
            # actually talks, so drafted replies sound like him and the coaching
            # lesson lands in his own register instead of generic coaching-speak.
            user_style = await self._memory_store.get_user_style(device_id)

            opinions: list[AgentOpinion] = []
            async for event, opinion in self._run_debate_agents(
                context, memory, persona, user_style, response_language, mode
            ):
                yield event
                if opinion is not None:
                    opinions.append(opinion)

            # Round 2: each agent reacts to the other takes, sequentially, so later
            # speakers can reference earlier replies - this is the visible "debate"
            # the client renders as a conversation feed.
            async for event in self._run_rebuttal_round(context, opinions, response_language, mode):
                yield event

            yield DebateEvent(type="synthesis_started")
            result = await self._synthesize(
                context, opinions, persona, user_style, response_language, mode
            )
            yield DebateEvent(type="synthesis_done", payload=result.model_dump(mode="json"))

            # Learn the user's own voice from whatever he actually sent in this
            # screenshot - unconditional on contact_id, since this is about him,
            # not about any particular match. Skips the LLM call entirely if this
            # screenshot had no "user"-sender messages (nothing new to learn).
            await self._update_user_style(device_id, context)

            if contact_id:
                await self._memory_store.upsert_interaction(device_id, contact_id, result)
                updated_persona = await self._update_persona(device_id, contact_id, persona, context, result)
                read_count = await self._memory_store.get_read_count(device_id, contact_id)
                yield DebateEvent(
                    type="memory_updated",
                    payload={
                        "contact_id": contact_id,
                        "read_count": read_count,
                        "persona": updated_persona,
                    },
                )
        except Exception:
            logger.exception("swarm pipeline failed")
            yield DebateEvent(
                type="error",
                payload={"message": "Something went wrong talking to the AI - please try again in a moment."},
            )

    async def _extract_context(
        self,
        images: list[tuple[bytes, str]] | None,
        contact_id: str | None,
        text_content: str | None = None,
    ) -> ConversationContext:
        if images:
            context = await self._vision_client.vision_extract(images)
            if text_content:
                context = context.model_copy(update={"scenario_notes": text_content})
        elif text_content:
            context = await self._extract_text_context(text_content)
        else:
            raise ValueError("run_pipeline requires at least one of images or text_content")

        if contact_id and context.contact_id != contact_id:
            context = context.model_copy(update={"contact_id": contact_id})
        return context

    async def _extract_text_context(self, text_content: str) -> ConversationContext:
        """Parses copy-pasted/typed conversation text into a ConversationContext,
        the text-only sibling of `vision_extract` (see llm_clients/anthropic_client.py
        for the equivalent image path and its extracted_at/scenario_notes handling)."""
        schema = ConversationContext.model_json_schema()
        for field in ("extracted_at", "scenario_notes"):
            schema["properties"].pop(field, None)
        if "required" in schema:
            schema["required"] = [f for f in schema["required"] if f not in ("extracted_at", "scenario_notes")]

        data = await self._vision_client.complete_json(
            TEXT_EXTRACT_SYSTEM_PROMPT, build_text_extract_user_prompt(text_content), schema
        )
        data["extracted_at"] = datetime.now(timezone.utc).isoformat()
        return ConversationContext.model_validate(data)

    async def _run_debate_agents(
        self,
        context: ConversationContext,
        memory: list[MemoryRecord],
        persona: str | None = None,
        user_style: str | None = None,
        response_language: str = "English",
        mode: SocialMode = "hype",
    ) -> AsyncIterator[tuple[DebateEvent, AgentOpinion | None]]:
        """Runs Arthur, Clara, and Leo concurrently, streaming progress events as they land.

        A producer task fans the three agents out via asyncio.gather while pushing
        agent_started/agent_done events onto a queue as they happen; this generator
        drains the queue as the consumer, so events interleave by actual completion
        order rather than by agent declaration order.
        """
        queue: asyncio.Queue = asyncio.Queue()

        async def run_one(agent_name: AgentName, system_prompt: str) -> AgentOpinion:
            await queue.put(DebateEvent(type="agent_started", agent=agent_name))
            user_prompt = build_debate_user_prompt(
                context, memory, persona, user_style, response_language, mode
            )
            raw = await self._debate_client.complete_text(system_prompt, user_prompt)
            headline, detail = split_headline_and_detail(raw)
            opinion = AgentOpinion(agent=agent_name, headline=headline, analysis=detail)
            await queue.put(DebateEvent(type="agent_done", agent=agent_name, payload=opinion.model_dump(mode="json")))
            return opinion

        async def run_all() -> list[AgentOpinion]:
            # The sentinel must go out even if an agent raises - otherwise the
            # consumer loop below awaits queue.get() forever, since nothing else
            # will ever put another item on the queue. Confirmed live: without
            # this `finally`, one failed agent call deadlocked the whole request
            # instead of surfacing an error (asyncio.gather's default behavior on
            # an exception is to propagate it to the *awaiter*, not to whatever
            # else was consuming a side-channel queue those tasks happened to use).
            try:
                results = await asyncio.gather(*(run_one(name, prompt) for name, prompt in _DEBATE_AGENTS))
                return list(results)
            finally:
                await queue.put(_SENTINEL)

        gather_task = asyncio.create_task(run_all())

        opinion_by_agent: dict[AgentName, AgentOpinion] = {}
        while True:
            item = await queue.get()
            if item is _SENTINEL:
                break
            assert isinstance(item, DebateEvent)
            opinion = None
            if item.type == "agent_done" and item.payload is not None:
                opinion = AgentOpinion.model_validate(item.payload)
                opinion_by_agent[opinion.agent] = opinion
            yield item, opinion

        await gather_task  # already complete; surfaces exceptions if any agent raised

    async def _run_rebuttal_round(
        self,
        context: ConversationContext,
        opinions: list[AgentOpinion],
        response_language: str = "English",
        mode: SocialMode = "hype",
    ) -> AsyncIterator[DebateEvent]:
        prior_replies: list[tuple[str, str]] = []
        for agent_name, system_prompt in _DEBATE_AGENTS:
            user_prompt = build_rebuttal_user_prompt(
                context, opinions, prior_replies, agent_name, response_language, mode
            )
            raw = await self._debate_client.complete_text(system_prompt, user_prompt)
            text = cap_sentences(raw, max_sentences=1, max_chars=220)
            prior_replies.append((agent_name, text))
            yield DebateEvent(type="agent_reply", agent=agent_name, payload={"text": text})

    async def _synthesize(
        self,
        context: ConversationContext,
        opinions: list[AgentOpinion],
        persona: str | None = None,
        user_style: str | None = None,
        response_language: str = "English",
        mode: SocialMode = "hype",
    ) -> SynthesisResult:
        user_prompt = build_synthesis_user_prompt(
            context, opinions, persona, user_style, response_language, mode
        )
        schema = SynthesisResult.model_json_schema()
        data = await self._vision_client.complete_json(SYNTHESIZER_SYSTEM_PROMPT, user_prompt, schema)
        return SynthesisResult.model_validate(data)

    async def _update_persona(
        self,
        device_id: str,
        contact_id: str,
        old_persona: str | None,
        context: ConversationContext,
        result: SynthesisResult,
    ) -> str:
        """Distills this read into the contact's evolving persona document.

        Runs on the vision/synthesis client (needs judgment, not speed) and is the
        mechanism by which the app 'learns' a contact across reads.
        """
        result_summary = (
            f"Attraction {result.attraction_level}/10. {result.dynamic_analysis} "
            f"Lesson: {result.coaching_lesson}"
        )
        persona = await self._vision_client.complete_text(
            PERSONA_SYSTEM_PROMPT,
            build_persona_user_prompt(old_persona, context, result_summary),
        )
        await self._memory_store.upsert_persona(device_id, contact_id, persona)
        return persona

    async def _update_user_style(self, device_id: str, context: ConversationContext) -> None:
        """Distills the user's own texting voice from his "user"-sender messages
        in this screenshot, merged with whatever was already known. Global, not
        per-contact - the same profile is used no matter which match this was.

        This is also how "iterations on our suggestions" get learned, without any
        special diffing logic: whatever he actually ends up sending - whether it's
        our best_response verbatim or something he rewrote in his own words - just
        shows up as his next "user" message the next time a screenshot of that
        conversation is uploaded, and folds into the profile like any other read.
        """
        user_lines = [m.text for m in context.messages if m.sender == "user" and m.text.strip()]
        if not user_lines:
            return  # nothing new to learn from this screenshot

        old_style = await self._memory_store.get_user_style(device_id)
        updated_style = await self._vision_client.complete_text(
            USER_STYLE_SYSTEM_PROMPT,
            build_user_style_user_prompt(old_style, user_lines),
        )
        await self._memory_store.upsert_user_style(device_id, updated_style)
