from __future__ import annotations

import asyncio

from agents.prompts import (
    _pronoun_header,
    _pronoun_set,
    build_debate_user_prompt,
    build_synthesis_user_prompt,
)
from datetime import datetime, timezone

from llm_clients.base import MockLLMClient
from memory.store import NoOpMemoryStore
from models.schemas import ConversationContext, Message
from swarm_orchestrator import SwarmOrchestrator

IMAGE_BYTES = b"<fake-screenshot-bytes>"
IMAGES = [(IMAGE_BYTES, "image/png")]

CONTEXT = ConversationContext(
    messages=[Message(sender="match", text="hey")],
    extracted_at=datetime.now(timezone.utc),
)


def test_pronoun_set_covers_all_three_genders_and_unset() -> None:
    assert _pronoun_set("male") == {"subject": "he", "object": "him", "possessive": "his"}
    assert _pronoun_set("female") == {"subject": "she", "object": "her", "possessive": "her"}
    assert _pronoun_set("non_binary") == {"subject": "they", "object": "them", "possessive": "their"}
    assert _pronoun_set(None) == {"subject": "they", "object": "them", "possessive": "their"}


def test_pronoun_header_names_both_roles_explicitly() -> None:
    header = _pronoun_header(user_gender="female", match_gender="male")
    assert "the user is she/her/her" in header
    assert "the match is he/him/his" in header


def test_pronoun_header_defaults_to_neutral_when_unset() -> None:
    header = _pronoun_header()
    assert "the user is they/them/their" in header
    assert "the match is they/them/their" in header


def test_debate_and_synthesis_prompts_carry_the_pronoun_header() -> None:
    debate_prompt = build_debate_user_prompt(
        CONTEXT, memory=[], user_gender="male", match_gender="female"
    )
    synthesis_prompt = build_synthesis_user_prompt(
        CONTEXT, opinions=[], user_gender="male", match_gender="female"
    )
    assert "the user is he/him/his" in debate_prompt
    assert "the match is she/her/her" in synthesis_prompt


def test_debate_prompt_no_longer_hardcodes_her_for_the_match() -> None:
    """The literal bug this phase fixes: this exact string used to be
    hardcoded regardless of any gender setting."""
    prompt = build_debate_user_prompt(CONTEXT, memory=[])
    assert "What we know about her from previous reads" not in prompt
    assert "What we know about the match from previous reads" in prompt


def test_mock_pipeline_output_reflects_an_inverted_gender_assignment() -> None:
    """End-to-end: MockLLMClient's canned fixture text is written with
    he=user/she=match by convention - request the OPPOSITE assignment
    (female user, male match) and confirm the actual synthesis_done payload
    uses "she" for the user and "he" for the match, not the other way around.
    This is the definitive proof the whole chain (request params ->
    swarm_orchestrator -> prompts.py -> LLM client) actually wires gender
    through, not just that the plumbing compiles."""

    async def run() -> dict:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        result_payload = None
        async for event in orchestrator.run_pipeline(
            IMAGES,
            contact_id=None,
            device_id="test-device",
            user_gender="female",
            match_gender="male",
        ):
            if event.type == "synthesis_done" and event.payload:
                result_payload = event.payload
        assert result_payload is not None
        return result_payload

    result = asyncio.run(run())

    # Default mock text: "...whether he'll over-invest to win her over" (he=user, her=match).
    # Inverted (female user, male match), it must become "she"/"him".
    combined = " ".join(result["what_they_are_thinking"]) + " " + result["dynamic_analysis"]
    assert "she" in combined.lower() or "her" in combined.lower()
    assert "win him over" in combined.lower() or "him" in combined.lower()

    # Sentence-initial capitalized pronouns must substitute too, not just
    # mid-sentence lowercase ones - confirmed live via a browser check that
    # dynamic_summary's "She's testing..." (capital S) stayed unchanged
    # regardless of match_gender until the substitution regex was made
    # case-insensitive.
    assert result["dynamic_summary"].startswith("He's") or "He's" in result["dynamic_summary"]
    assert not result["dynamic_summary"].startswith("She's")
    assert result["coaching_lesson"].strip().startswith(
        "Never"
    )  # sanity: still the expected sentence, not corrupted
    assert "let him lean in" in result["coaching_lesson"].lower()


def test_mock_pipeline_defaults_to_neutral_pronouns_when_gender_unset() -> None:
    async def run() -> dict:
        orchestrator = SwarmOrchestrator(
            vision_client=MockLLMClient(),
            debate_client=MockLLMClient(),
            memory_store=NoOpMemoryStore(),
        )
        result_payload = None
        async for event in orchestrator.run_pipeline(
            IMAGES, contact_id=None, device_id="test-device"
        ):
            if event.type == "synthesis_done" and event.payload:
                result_payload = event.payload
        assert result_payload is not None
        return result_payload

    result = asyncio.run(run())
    combined = (
        " ".join(result["what_they_are_thinking"])
        + " "
        + result["dynamic_analysis"]
        + " "
        + result["coaching_lesson"]
    ).lower()
    for pronoun in (" he ", " she ", " him ", " her ", " his "):
        assert pronoun not in f" {combined} ", f"found gendered pronoun {pronoun!r} in neutral-default output"
