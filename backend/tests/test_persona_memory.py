from __future__ import annotations

import asyncio
from pathlib import Path

from llm_clients.base import MockLLMClient
from memory.sqlite_store import SQLiteMemoryStore
from swarm_orchestrator import SwarmOrchestrator

IMAGE_BYTES = b"<fake-screenshot-bytes>"
MIME_TYPE = "image/png"
IMAGES = [(IMAGE_BYTES, MIME_TYPE)]


def test_persona_builds_and_compounds_across_reads(tmp_path: Path) -> None:
    """Two reads of the same contact: the first creates a persona, the second
    updates it and bumps the read count - the 'app learns each contact' loop."""
    store = SQLiteMemoryStore(tmp_path / "memory.db")

    async def run_once() -> list[str]:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=store,
        )
        return [
            e.type
            async for e in orchestrator.run_pipeline(IMAGES, contact_id="sarah")
        ]

    events_first = asyncio.run(run_once())
    assert events_first[-1] == "memory_updated"

    persona_after_first = asyncio.run(store.get_persona("sarah"))
    assert persona_after_first and "Tests:" in persona_after_first
    assert asyncio.run(store.get_read_count("sarah")) == 1

    events_second = asyncio.run(run_once())
    assert events_second[-1] == "memory_updated"
    assert asyncio.run(store.get_read_count("sarah")) == 2

    # the mock marks whether it saw a prior persona, proving the old document
    # was fed back into the update prompt
    persona_after_second = asyncio.run(store.get_persona("sarah"))
    assert persona_after_second and "2 read(s)" in persona_after_second

    # history accumulates one summary per read
    history = asyncio.run(store.get_contact_history("sarah"))
    assert len(history) == 2

    contacts = asyncio.run(store.list_contacts())
    assert [c.display_name for c in contacts] == ["sarah"]
    assert contacts[0].session_count == 2


def test_no_memory_events_without_contact(tmp_path: Path) -> None:
    store = SQLiteMemoryStore(tmp_path / "memory.db")

    async def run() -> list[str]:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=store,
        )
        return [
            e.type
            async for e in orchestrator.run_pipeline(IMAGES, contact_id=None)
        ]

    events = asyncio.run(run())
    assert "memory_updated" not in events
    assert events[-1] == "synthesis_done"
    assert asyncio.run(store.list_contacts()) == []
