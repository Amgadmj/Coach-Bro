"""Real-provider smoke test: runs the full pipeline against live LLM APIs.

Usage (from backend/, with keys in .env and LLM_MODE=real):
    python scripts/run_pipeline_real.py [path/to/screenshot.png]

Prints each stage with timing so provider/key problems are pinpointed to the
exact call that failed (vision vs. debate vs. synthesis vs. persona).
"""

from __future__ import annotations

import asyncio
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from llm_clients.anthropic_client import AnthropicClient
from llm_clients.fast_client import FastLLMClient
from memory.sqlite_store import SQLiteMemoryStore
from models.schemas import SynthesisResult
from swarm_orchestrator import SwarmOrchestrator


async def main(image_path: Path) -> None:
    print(f"mode={os.environ.get('LLM_MODE')} vision_model={os.environ.get('ANTHROPIC_VISION_MODEL')} "
          f"fast_provider={os.environ.get('FAST_LLM_PROVIDER')}")
    image_bytes = image_path.read_bytes()
    print(f"image: {image_path} ({len(image_bytes)} bytes)\n")

    orchestrator = SwarmOrchestrator(
        vision_client=AnthropicClient(),
        debate_client=FastLLMClient(),
        memory_store=SQLiteMemoryStore("data/memory_realtest.db"),
    )

    t0 = time.monotonic()
    last = t0
    final: SynthesisResult | None = None
    try:
        async for event in orchestrator.run_pipeline(image_bytes, "image/png", contact_id="realtest"):
            now = time.monotonic()
            stamp = f"[{now - t0:6.1f}s +{now - last:5.1f}s]"
            last = now
            suffix = f" ({event.agent})" if event.agent else ""
            print(f"{stamp} {event.type}{suffix}")
            if event.type == "extraction_done" and event.payload:
                for m in event.payload.get("messages", []):
                    print(f"          | {m['sender']}: {m['text']!r}")
            if event.type == "agent_done" and event.payload:
                print(f"          | {event.payload.get('analysis', '')[:120]}...")
            if event.type == "agent_reply" and event.payload:
                print(f"          | {event.payload.get('text', '')[:120]}...")
            if event.type == "synthesis_done" and event.payload:
                final = SynthesisResult.model_validate(event.payload)
            if event.type == "memory_updated" and event.payload:
                print(f"          | persona: {event.payload.get('persona', '')[:120]}...")
    except Exception as exc:  # noqa: BLE001 - a smoke test wants the raw failure
        print(f"\nFAILED at the stage above: {type(exc).__name__}: {exc}")
        raise SystemExit(1)

    assert final is not None
    print("\n=== FINAL RESULT ===")
    print(final.model_dump_json(indent=2))
    print(f"\ntotal: {time.monotonic() - t0:.1f}s")


if __name__ == "__main__":
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).parent / "fixtures" / "test_chat.png"
    if not path.exists():
        raise SystemExit(f"No screenshot at {path} - run scripts/generate_test_screenshot.py first")
    asyncio.run(main(path))
