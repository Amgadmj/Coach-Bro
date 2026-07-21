from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from llm_clients.base import MockLLMClient
from memory.sqlite_store import SQLiteMemoryStore
from models.schemas import ConversationContext, Message
from swarm_orchestrator import SwarmOrchestrator

IMAGE_BYTES = b"<fake-screenshot-bytes>"
MIME_TYPE = "image/png"
IMAGES = [(IMAGE_BYTES, MIME_TYPE)]


def test_user_style_is_global_and_compounds_without_needing_a_contact(tmp_path: Path) -> None:
    """The user's voice profile isn't per-contact - it should be learned and
    persisted even when contact_id is None, since it's about him, not any match."""
    store = SQLiteMemoryStore(tmp_path / "memory.db")

    async def run_once() -> list[str]:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(), debate_client=MockLLMClient(), memory_store=store
        )
        return [
            e.type
            async for e in orchestrator.run_pipeline(IMAGES, contact_id=None)
        ]

    events = asyncio.run(run_once())
    assert "memory_updated" not in events  # no contact -> no per-contact memory event
    assert events[-1] == "synthesis_done"

    style_after_first = asyncio.run(store.get_user_style())
    assert style_after_first is not None
    assert "Casual and warm" in style_after_first

    asyncio.run(run_once())
    style_after_second = asyncio.run(store.get_user_style())
    assert "confirmed across multiple reads" in style_after_second


def test_no_user_authored_messages_skips_the_style_update_entirely(tmp_path: Path) -> None:
    """Nothing to learn from a screenshot with no 'user'-sender messages - must
    not spend an LLM call, and must not overwrite the existing profile."""
    store = SQLiteMemoryStore(tmp_path / "memory.db")
    asyncio.run(store.upsert_user_style("existing profile, should not change"))

    calls: list[str] = []

    class RecordingClient(MockLLMClient):
        async def complete_text(self, system: str, user: str) -> str:  # type: ignore[override]
            calls.append(user)
            return await super().complete_text(system, user)

    orchestrator = SwarmOrchestrator(
        vision_client=RecordingClient(), debate_client=MockLLMClient(), memory_store=store
    )
    context = ConversationContext(
        messages=[Message(sender="match", text="hey, only her talking here")],
        extracted_at=datetime.now(timezone.utc),
    )

    asyncio.run(orchestrator._update_user_style(context))

    assert not any("Previous voice profile:" in c for c in calls)
    assert asyncio.run(store.get_user_style()) == "existing profile, should not change"


def test_user_style_is_threaded_into_debate_and_synthesis_prompts(tmp_path: Path) -> None:
    """Once a style profile exists, it must actually reach the agents (so Leo can
    draft in the user's voice) and the synthesizer (so coaching_lesson matches it)."""
    store = SQLiteMemoryStore(tmp_path / "memory.db")
    asyncio.run(store.upsert_user_style("dry, one-word replies, never uses emoji"))

    debate_prompts: list[str] = []

    class RecordingDebateClient(MockLLMClient):
        async def complete_text(self, system: str, user: str) -> str:  # type: ignore[override]
            debate_prompts.append(user)
            return await super().complete_text(system, user)

    async def run() -> None:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=RecordingDebateClient(),
            memory_store=store,
        )
        async for _ in orchestrator.run_pipeline(IMAGES, contact_id=None):
            pass

    asyncio.run(run())

    take_prompts = [p for p in debate_prompts if "Debate round:" not in p]
    assert take_prompts, "no round-1 debate prompts were recorded"
    assert all("dry, one-word replies, never uses emoji" in p for p in take_prompts)
