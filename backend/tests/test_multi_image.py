from __future__ import annotations

import asyncio

from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from swarm_orchestrator import SwarmOrchestrator


def test_run_pipeline_passes_every_attached_image_to_vision_extract() -> None:
    """Multiple screenshots in one call must all reach vision_extract together
    (so the model can merge/de-dupe across them), not just the first one -
    the merging itself happens inside the vision model, not our code, so this
    only verifies our side of the contract: nothing gets dropped or truncated
    before the image list reaches the LLM client."""
    received: list[list[tuple[bytes, str]]] = []

    class RecordingVisionClient(MockLLMClient):
        async def vision_extract(self, images):  # type: ignore[override]
            received.append(list(images))
            return await super().vision_extract(images)

    images = [(b"shot-1", "image/png"), (b"shot-2", "image/png"), (b"shot-3", "image/jpeg")]

    async def run() -> None:
        orchestrator = SwarmOrchestrator(
            vision_client=RecordingVisionClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        async for _ in orchestrator.run_pipeline(images, contact_id=None):
            pass

    asyncio.run(run())

    assert received == [images]
