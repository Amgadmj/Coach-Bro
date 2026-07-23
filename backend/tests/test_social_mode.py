from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from agents.prompts import (
    build_debate_user_prompt,
    build_rebuttal_user_prompt,
    build_suggest_user_prompt,
    build_synthesis_user_prompt,
)
from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from models.schemas import ConversationContext, Message
from swarm_orchestrator import SwarmOrchestrator

IMAGE_BYTES = b"<fake-screenshot-bytes>"
MIME_TYPE = "image/png"
IMAGES = [(IMAGE_BYTES, MIME_TYPE)]


def test_social_mode_header_appears_in_every_debate_stage_prompt() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="hey")],
        extracted_at=datetime.now(timezone.utc),
    )
    debate_prompt = build_debate_user_prompt(context, memory=[], mode="romantic")
    rebuttal_prompt = build_rebuttal_user_prompt(
        context, opinions=[], prior_replies=[], agent_name="arthur", mode="romantic"
    )
    synthesis_prompt = build_synthesis_user_prompt(context, opinions=[], mode="romantic")
    suggest_prompt = build_suggest_user_prompt("at a coffee shop", "romantic")

    assert "SOCIAL MODE: romantic" in debate_prompt
    assert "SOCIAL MODE: romantic" in rebuttal_prompt
    assert "SOCIAL MODE: romantic" in synthesis_prompt
    assert "SOCIAL MODE: romantic" in suggest_prompt


def test_social_mode_defaults_to_hype_when_unspecified() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="hey")],
        extracted_at=datetime.now(timezone.utc),
    )
    assert "SOCIAL MODE: hype" in build_debate_user_prompt(context, memory=[])
    assert "SOCIAL MODE: hype" in build_synthesis_user_prompt(context, opinions=[])


def test_pipeline_threads_a_social_mode_override_into_every_debate_stage_prompt() -> None:
    """Every LLM call the debate/rebuttal/synthesis stages make must carry the
    Social Mode the user picked in the UI, not just the vision/language stages."""
    seen_user_prompts: list[str] = []

    class RecordingDebateClient(MockLLMClient):
        async def complete_text(self, system: str, user: str) -> str:  # type: ignore[override]
            seen_user_prompts.append(user)
            return await super().complete_text(system, user)

    seen_synthesis_prompts: list[str] = []

    class RecordingVisionClient(MockLLMClient):
        async def complete_json(self, system: str, user: str, json_schema: dict) -> dict:  # type: ignore[override]
            seen_synthesis_prompts.append(user)
            return await super().complete_json(system, user, json_schema)

    async def run() -> None:
        orchestrator = SwarmOrchestrator(
            vision_client=RecordingVisionClient(),
            debate_client=RecordingDebateClient(),
            memory_store=NoOpMemoryStore(),
        )
        async for _ in orchestrator.run_pipeline(IMAGES, contact_id=None, device_id="test-device", mode="direct"):
            pass

    asyncio.run(run())

    assert seen_user_prompts, "no debate/rebuttal prompts were recorded"
    assert all("SOCIAL MODE: direct" in p for p in seen_user_prompts)
    assert seen_synthesis_prompts, "no synthesis prompt was recorded"
    assert "SOCIAL MODE: direct" in seen_synthesis_prompts[0]
