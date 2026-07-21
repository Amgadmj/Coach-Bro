from __future__ import annotations

import asyncio
import time

from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from models.schemas import SynthesisResult
from swarm_orchestrator import SwarmOrchestrator

IMAGE_BYTES = b"<fake-screenshot-bytes>"
MIME_TYPE = "image/png"


def test_pipeline_produces_valid_result() -> None:
    async def run() -> tuple[list[str], SynthesisResult | None]:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        event_types: list[str] = []
        final_result: SynthesisResult | None = None
        async for event in orchestrator.run_pipeline(IMAGE_BYTES, MIME_TYPE, contact_id=None):
            event_types.append(event.type)
            if event.type == "synthesis_done" and event.payload:
                final_result = SynthesisResult.model_validate(event.payload)
        return event_types, final_result

    event_types, final_result = asyncio.run(run())

    assert event_types[0] == "extraction_started"
    assert event_types[1] == "extraction_done"
    assert event_types.count("agent_started") == 3
    assert event_types.count("agent_done") == 3
    assert "synthesis_started" in event_types
    assert event_types[-1] == "synthesis_done"

    assert final_result is not None
    assert 1 <= final_result.attraction_level <= 10


def test_debate_agents_run_concurrently() -> None:
    """Elapsed time for the 3-agent debate stage should track max(latency), not sum(latency).

    Proves asyncio.gather is actually fanning the agents out in parallel rather than
    accidentally running them sequentially.
    """
    per_call_latency = 0.15

    async def run() -> float:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(latency_seconds=0.0),
            debate_client=MockLLMClient(latency_seconds=per_call_latency),
            memory_store=NoOpMemoryStore(),
        )
        start = time.monotonic()
        async for event in orchestrator.run_pipeline(IMAGE_BYTES, MIME_TYPE, contact_id=None):
            if event.type == "synthesis_started":
                # debate stage is fully drained by the time synthesis starts
                return time.monotonic() - start
        raise AssertionError("pipeline never reached synthesis_started")

    elapsed = asyncio.run(run())

    sequential_estimate = per_call_latency * 3
    assert elapsed < sequential_estimate * 0.8, (
        f"debate stage took {elapsed:.3f}s, expected close to {per_call_latency:.3f}s "
        f"(parallel) rather than {sequential_estimate:.3f}s (sequential)"
    )
