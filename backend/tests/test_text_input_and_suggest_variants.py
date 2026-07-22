from __future__ import annotations

import asyncio
import io
import os

os.environ.setdefault("LLM_MODE", "mock")

from fastapi.testclient import TestClient

import main
from agents.prompts import build_suggest_user_prompt
from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from models.schemas import SynthesisResult
from swarm_orchestrator import SwarmOrchestrator

client = TestClient(main.app)

IMAGE_BYTES = b"<fake-screenshot-bytes>"
MIME_TYPE = "image/png"
IMAGES = [(IMAGE_BYTES, MIME_TYPE)]
PASTED_TEXT = "her: hey! saw you're into hiking too\nme: yeah I try to get out most weekends"


def _image_file(name: str = "shot.png") -> tuple[str, tuple[str, io.BytesIO, str]]:
    return "images", (name, io.BytesIO(b"fake-bytes"), "image/png")


# --- orchestrator-level: text-only and hybrid extraction -------------------------------


def test_pipeline_runs_full_debate_from_text_content_alone() -> None:
    """Pasted/typed text with no screenshot must still run the full 3-agent swarm
    debate, not the lighter /suggest-style flow - see CLAUDE.md's user-facing
    behavior change note for this feature."""

    async def run() -> tuple[list[str], SynthesisResult | None]:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        event_types: list[str] = []
        final_result: SynthesisResult | None = None
        async for event in orchestrator.run_pipeline(
            images=None, contact_id=None, text_content=PASTED_TEXT
        ):
            event_types.append(event.type)
            if event.type == "synthesis_done" and event.payload:
                final_result = SynthesisResult.model_validate(event.payload)
        return event_types, final_result

    event_types, final_result = asyncio.run(run())

    assert event_types.count("agent_started") == 3
    assert event_types.count("agent_done") == 3
    assert event_types[-1] == "synthesis_done"
    assert final_result is not None


def test_pipeline_rejects_neither_images_nor_text() -> None:
    async def run() -> list[str]:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        return [
            e.type
            async for e in orchestrator.run_pipeline(images=None, contact_id=None, text_content=None)
        ]

    event_types = asyncio.run(run())
    assert event_types == ["extraction_started", "error"]


def test_pipeline_attaches_text_content_as_scenario_notes_when_images_also_given() -> None:
    async def run() -> str | None:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        async for event in orchestrator.run_pipeline(
            images=IMAGES, contact_id=None, text_content="she's been slow to reply all week"
        ):
            if event.type == "extraction_done" and event.payload:
                return event.payload.get("scenario_notes")
        return None

    scenario_notes = asyncio.run(run())
    assert scenario_notes == "she's been slow to reply all week"


# --- route-level: POST /analyze -------------------------------------------------------


def test_analyze_accepts_text_only_request() -> None:
    response = client.post("/analyze", data={"text_content": PASTED_TEXT})
    assert response.status_code == 200
    assert "synthesis_done" in response.text


def test_analyze_accepts_images_and_text_together() -> None:
    response = client.post(
        "/analyze",
        data={"text_content": "we matched last week, she runs marathons"},
        files=[_image_file()],
    )
    assert response.status_code == 200
    assert "synthesis_done" in response.text


def test_analyze_rejects_overlong_text_content() -> None:
    response = client.post("/analyze", data={"text_content": "x" * 5000})
    assert response.status_code == 400
    assert "too long" in response.json()["detail"].lower()


def test_analyze_falls_back_to_extension_for_generic_content_type() -> None:
    # e.g. a clipboard paste or canvas-derived blob with no real content-type set.
    response = client.post(
        "/analyze",
        files=[("images", ("shot.png", io.BytesIO(b"fake-bytes"), "application/octet-stream"))],
    )
    assert response.status_code == 200
    assert "synthesis_done" in response.text


# --- route-level: POST /suggest --------------------------------------------------------


def test_suggest_accepts_category_and_seed() -> None:
    response = client.post(
        "/suggest",
        json={"scenario": "she went quiet after a great first date", "category": "vibe_shift", "seed": 2},
    )
    assert response.status_code == 200
    assert len(response.json()["suggestions"]) == 3


def test_suggest_defaults_category_to_opener() -> None:
    response = client.post("/suggest", json={"scenario": "just matched on the app"})
    assert response.status_code == 200


def test_suggest_user_prompt_carries_category_mission_and_variation_round() -> None:
    opener_prompt = build_suggest_user_prompt("at the gym", "hype", category="opener")
    exit_prompt = build_suggest_user_prompt("it's fizzled out", "hype", category="exit_strategy", seed=3)

    assert "opening lines" in opener_prompt
    assert "exit lines" in exit_prompt
    assert "Variation round: 3" in exit_prompt
    assert "Variation round" not in opener_prompt
