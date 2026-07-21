"""Zero-dependency smoke test for the swarm pipeline.

Run with: python scripts/run_pipeline_mock.py   (from inside backend/)

Requires no API keys and no Supabase connection - proves the concurrency
and schema contract are correct before any real provider is wired in.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from models.schemas import SynthesisResult
from swarm_orchestrator import SwarmOrchestrator


async def main() -> None:
    orchestrator = SwarmOrchestrator(
        vision_client=MockLLMClient(),
        debate_client=MockLLMClient(),
        memory_store=NoOpMemoryStore(),
    )

    final_result: SynthesisResult | None = None
    async for event in orchestrator.run_pipeline(
        image_bytes=b"<fake-screenshot-bytes>",
        mime_type="image/png",
        contact_id="demo-contact",
    ):
        agent_suffix = f" ({event.agent})" if event.agent else ""
        print(f"[{event.type}]{agent_suffix}")
        if event.type == "synthesis_done" and event.payload:
            final_result = SynthesisResult.model_validate(event.payload)

    assert final_result is not None, "pipeline finished without a synthesis_done event"
    print("\nFinal result:")
    print(final_result.model_dump_json(indent=2))


if __name__ == "__main__":
    asyncio.run(main())
