"""Real-provider smoke test: runs the full pipeline against live LLM APIs.

Usage (from backend/, with keys in .env and LLM_MODE=real):
    python scripts/run_pipeline_real.py [--mode=hype|chill|romantic|direct] [path/to/screenshot.png ...]

Pass multiple paths to test the multi-screenshot merge/de-dupe path (e.g. two
scrolled captures of the same conversation). Prints each stage with timing so
provider/key problems are pinpointed to the exact call that failed (vision vs.
debate vs. synthesis vs. persona). --mode lets you spot-check that Social Mode
actually shifts the agents' tone against a real model, not just the mock client -
each mode gets its own contact_id so personas/memory don't bleed across runs.
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


async def main(image_paths: list[Path], social_mode: str) -> None:
    print(f"mode={os.environ.get('LLM_MODE')} vision_model={os.environ.get('ANTHROPIC_VISION_MODEL')} "
          f"fast_provider={os.environ.get('FAST_LLM_PROVIDER')} social_mode={social_mode}")
    images = [(p.read_bytes(), "image/png") for p in image_paths]
    for p, (data, _) in zip(image_paths, images):
        print(f"image: {p} ({len(data)} bytes)")
    print()

    debate_provider = os.environ.get("FAST_LLM_PROVIDER", "groq")
    vision_client = AnthropicClient()
    debate_client = vision_client if debate_provider == "anthropic" else FastLLMClient()

    orchestrator = SwarmOrchestrator(
        vision_client=vision_client,
        debate_client=debate_client,
        memory_store=SQLiteMemoryStore("data/memory_realtest.db"),
    )

    t0 = time.monotonic()
    last = t0
    final: SynthesisResult | None = None
    try:
        async for event in orchestrator.run_pipeline(
            images, contact_id=f"realtest-{social_mode}", mode=social_mode
        ):
            now = time.monotonic()
            stamp = f"[{now - t0:6.1f}s +{now - last:5.1f}s]"
            last = now
            suffix = f" ({event.agent})" if event.agent else ""
            print(f"{stamp} {event.type}{suffix}")
            if event.type == "extraction_done" and event.payload:
                for m in event.payload.get("messages", []):
                    print(f"          | {m['sender']}: {m['text']!r}")
            if event.type == "agent_done" and event.payload:
                print(f"          | {event.payload.get('headline', '')}")
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
    args = sys.argv[1:]
    mode = "hype"
    for arg in list(args):
        if arg.startswith("--mode="):
            mode = arg.split("=", 1)[1]
            args.remove(arg)

    paths = (
        [Path(p) for p in args] if args else [Path(__file__).parent / "fixtures" / "test_chat.png"]
    )
    for path in paths:
        if not path.exists():
            raise SystemExit(f"No screenshot at {path} - run scripts/generate_test_screenshot.py first")
    asyncio.run(main(paths, mode))
