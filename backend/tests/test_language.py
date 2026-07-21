from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from agents.prompts import (
    build_debate_user_prompt,
    build_suggest_user_prompt,
    build_synthesis_user_prompt,
    resolve_response_language,
)
from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from models.schemas import ConversationContext, Message
from swarm_orchestrator import SwarmOrchestrator

IMAGE_BYTES = b"<fake-screenshot-bytes>"
MIME_TYPE = "image/png"


def test_resolve_response_language_prefers_explicit_preference() -> None:
    assert resolve_response_language("es", detected="French") == "Spanish"


def test_resolve_response_language_auto_uses_detected() -> None:
    assert resolve_response_language("auto", detected="Egyptian Arabic") == "Egyptian Arabic"


def test_resolve_response_language_auto_without_detection_falls_back_to_english() -> None:
    assert resolve_response_language("auto", detected=None) == "English"


def test_language_header_appears_in_every_debate_stage_prompt() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="hola")],
        extracted_at=datetime.now(timezone.utc),
        detected_language="Spanish",
    )
    debate_prompt = build_debate_user_prompt(context, memory=[], language="Spanish")
    synthesis_prompt = build_synthesis_user_prompt(context, opinions=[], language="Spanish")
    suggest_prompt = build_suggest_user_prompt("en un cafe", "chill", language="French")

    assert "RESPOND ENTIRELY IN: Spanish" in debate_prompt
    assert "RESPOND ENTIRELY IN: Spanish" in synthesis_prompt
    assert "RESPOND ENTIRELY IN: French" in suggest_prompt


def test_pipeline_resolves_and_threads_a_language_override(monkeypatch) -> None:
    """An explicit override must win even though the (mock) extraction detects English,
    and every debate-stage prompt sent to the LLM client must carry it."""
    seen_user_prompts: list[str] = []

    class RecordingDebateClient(MockLLMClient):
        async def complete_text(self, system: str, user: str) -> str:  # type: ignore[override]
            seen_user_prompts.append(user)
            return await super().complete_text(system, user)

    async def run() -> None:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=RecordingDebateClient(),
            memory_store=NoOpMemoryStore(),
        )
        async for _ in orchestrator.run_pipeline(
            IMAGE_BYTES, MIME_TYPE, contact_id=None, language="es"
        ):
            pass

    asyncio.run(run())

    assert seen_user_prompts, "no prompts were recorded"
    assert all("RESPOND ENTIRELY IN: Spanish" in p for p in seen_user_prompts)
