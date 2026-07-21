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
import re
from collections.abc import AsyncIterator
from typing import Protocol

logger = logging.getLogger(__name__)

from agents.prompts import (
    ARTHUR_SYSTEM_PROMPT,
    CLARA_SYSTEM_PROMPT,
    LEO_SYSTEM_PROMPT,
    PERSONA_SYSTEM_PROMPT,
    SYNTHESIZER_SYSTEM_PROMPT,
    build_debate_user_prompt,
    build_persona_user_prompt,
    build_rebuttal_user_prompt,
    build_synthesis_user_prompt,
    resolve_response_language,
)
from llm_clients.base import LLMClient
from models.schemas import (
    AgentName,
    AgentOpinion,
    ConversationContext,
    DebateEvent,
    MemoryRecord,
    SupportedLanguage,
    SynthesisResult,
)

_DEBATE_AGENTS: tuple[tuple[AgentName, str], ...] = (
    ("arthur", ARTHUR_SYSTEM_PROMPT),
    ("clara", CLARA_SYSTEM_PROMPT),
    ("leo", LEO_SYSTEM_PROMPT),
)

_SENTINEL = object()


class MemoryStoreProtocol(Protocol):
    """Structural type for the memory dependency - see memory/store.py."""

    async def get_contact_history(self, contact_id: str) -> list[MemoryRecord]: ...

    async def upsert_interaction(self, contact_id: str, result: SynthesisResult) -> None: ...

    async def get_persona(self, contact_id: str) -> str | None: ...

    async def upsert_persona(self, contact_id: str, persona: str) -> None: ...

    async def get_read_count(self, contact_id: str) -> int: ...


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
        image_bytes: bytes,
        mime_type: str,
        contact_id: str | None,
        language: SupportedLanguage = "auto",
    ) -> AsyncIterator[DebateEvent]:
        """Yields DebateEvents for each stage; any failure anywhere in the pipeline
        (provider timeout, rate limit, bad key) is caught and turned into one final
        `error` event instead of an unhandled exception, which would otherwise kill
        the SSE stream as a raw dropped connection - the client has no way to
        distinguish that from a network blip. Confirmed live: a mid-debate Groq
        rate-limit error used to abort the HTTP response with no signal at all."""
        try:
            yield DebateEvent(type="extraction_started")
            context = await self._extract_context(image_bytes, mime_type, contact_id)
            yield DebateEvent(type="extraction_done", payload=context.model_dump(mode="json"))

            # Resolved once, after extraction sees the screenshot: an explicit user
            # preference forces this language; "auto" follows whatever the screenshot's
            # conversation is actually written in (falls back to English if undetected).
            response_language = resolve_response_language(language, context.detected_language)

            memory: list[MemoryRecord] = []
            persona: str | None = None
            if contact_id:
                memory = await self._memory_store.get_contact_history(contact_id)
                persona = await self._memory_store.get_persona(contact_id)

            opinions: list[AgentOpinion] = []
            async for event, opinion in self._run_debate_agents(
                context, memory, persona, response_language
            ):
                yield event
                if opinion is not None:
                    opinions.append(opinion)

            # Round 2: each agent reacts to the other takes, sequentially, so later
            # speakers can reference earlier replies - this is the visible "debate"
            # the client renders as a conversation feed.
            async for event in self._run_rebuttal_round(context, opinions, response_language):
                yield event

            yield DebateEvent(type="synthesis_started")
            result = await self._synthesize(context, opinions, persona, response_language)
            yield DebateEvent(type="synthesis_done", payload=result.model_dump(mode="json"))

            if contact_id:
                await self._memory_store.upsert_interaction(contact_id, result)
                updated_persona = await self._update_persona(contact_id, persona, context, result)
                read_count = await self._memory_store.get_read_count(contact_id)
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
        self, image_bytes: bytes, mime_type: str, contact_id: str | None
    ) -> ConversationContext:
        context = await self._vision_client.vision_extract(image_bytes, mime_type)
        if contact_id and context.contact_id != contact_id:
            context = context.model_copy(update={"contact_id": contact_id})
        return context

    async def _run_debate_agents(
        self,
        context: ConversationContext,
        memory: list[MemoryRecord],
        persona: str | None = None,
        response_language: str = "English",
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
            user_prompt = build_debate_user_prompt(context, memory, persona, response_language)
            raw = await self._debate_client.complete_text(system_prompt, user_prompt)
            headline, detail = _split_headline_and_detail(raw)
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
    ) -> AsyncIterator[DebateEvent]:
        prior_replies: list[tuple[str, str]] = []
        for agent_name, system_prompt in _DEBATE_AGENTS:
            user_prompt = build_rebuttal_user_prompt(
                context, opinions, prior_replies, agent_name, response_language
            )
            raw = await self._debate_client.complete_text(system_prompt, user_prompt)
            text = _cap_sentences(raw, max_sentences=1, max_chars=220)
            prior_replies.append((agent_name, text))
            yield DebateEvent(type="agent_reply", agent=agent_name, payload={"text": text})

    async def _synthesize(
        self,
        context: ConversationContext,
        opinions: list[AgentOpinion],
        persona: str | None = None,
        response_language: str = "English",
    ) -> SynthesisResult:
        user_prompt = build_synthesis_user_prompt(context, opinions, persona, response_language)
        schema = SynthesisResult.model_json_schema()
        data = await self._vision_client.complete_json(SYNTHESIZER_SYSTEM_PROMPT, user_prompt, schema)
        return SynthesisResult.model_validate(data)

    async def _update_persona(
        self,
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
        await self._memory_store.upsert_persona(contact_id, persona)
        return persona


_HEADLINE_RE = re.compile(r"^\s*headline\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE)


def _split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


def _truncate(text: str, max_chars: int) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def _split_headline_and_detail(
    raw: str, max_detail_sentences: int = 3, max_headline_chars: int = 90
) -> tuple[str, str]:
    """Parses the agent's `HEADLINE: ...` + detail format (see
    agents/prompts.py::_CHAT_OUTPUT_FORMAT) into a short always-visible headline
    and a capped expandable detail.

    Must never simply trust the prompt was followed: live testing has produced
    multi-paragraph essays from real providers despite an explicit strict format
    and a hard sentence limit. Both branches below cap detail length in code, so
    a debate bubble can never balloon into a wall of text regardless of what the
    model actually returned.
    """
    match = _HEADLINE_RE.search(raw)
    if match:
        headline = _truncate(match.group(1), max_headline_chars)
        detail_source = raw[match.end() :].strip()
    else:
        sentences = _split_sentences(raw)
        headline = _truncate(sentences[0], max_headline_chars) if sentences else _truncate(raw, max_headline_chars)
        detail_source = raw

    detail_sentences = _split_sentences(detail_source)[:max_detail_sentences]
    detail = " ".join(detail_sentences) if detail_sentences else headline
    return headline, detail


def _cap_sentences(text: str, max_sentences: int = 1, max_chars: int = 220) -> str:
    """Defensive cap for rebuttal replies, which should already be one short
    sentence by prompt instruction but aren't always in practice."""
    sentences = _split_sentences(text)[:max_sentences]
    capped = " ".join(sentences) if sentences else text.strip()
    return _truncate(capped, max_chars)
