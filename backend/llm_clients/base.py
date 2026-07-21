"""Provider-agnostic LLM client seam.

Every real provider integration (Anthropic, Groq, Gemini, ...) implements
`LLMClient`. Nothing in `swarm_orchestrator.py` or `main.py` should ever
import a provider SDK directly - see CLAUDE.md principle #2.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any, Protocol, runtime_checkable

from models.schemas import ConversationContext, Message


@runtime_checkable
class LLMClient(Protocol):
    """Minimal surface every provider client must implement.

    `vision_extract` and `complete_json` are only ever called on the
    vision+synthesis client. The three debate agents only call
    `complete_text`.
    """

    async def vision_extract(self, image_bytes: bytes, mime_type: str) -> ConversationContext: ...

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]: ...

    async def complete_text(self, system: str, user: str) -> str: ...


class MockLLMClient:
    """Deterministic, fixture-backed LLMClient. No network calls, no API keys.

    Used for local development and as the fixture in
    `backend/scripts/run_pipeline_mock.py` / `backend/tests/test_orchestrator_mock.py`.
    """

    def __init__(self, latency_seconds: float = 0.05) -> None:
        self._latency_seconds = latency_seconds

    async def vision_extract(self, image_bytes: bytes, mime_type: str) -> ConversationContext:
        await asyncio.sleep(self._latency_seconds)
        return ConversationContext(
            contact_id=None,
            extracted_at=datetime.now(timezone.utc),
            messages=[
                Message(sender="match", text="hey stranger 👀", response_lag_seconds=None),
                Message(sender="user", text="just thinking about you, wyd", response_lag_seconds=42.0),
                Message(sender="match", text="hmm maybe. depends what you're offering", response_lag_seconds=910.0),
            ],
        )

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(self._latency_seconds)
        if "suggestions" in json_schema.get("properties", {}):
            return {
                "suggestions": [
                    {"label": "Be bold", "text": "What's the craziest thing you've done tonight?"},
                    {"label": "Playful tease", "text": "You look like trouble, in a good way."},
                    {"label": "Direct", "text": "I'm glad I came over to talk to you."},
                ]
            }
        return {
            "attraction_level": 7,
            "dynamic_analysis": (
                "She's throwing a light compliance test ('depends what you're offering') "
                "rather than shutting the conversation down. Engagement is genuine but she "
                "wants to see if you chase."
            ),
            "what_she_is_thinking": [
                "Testing whether he'll over-invest to win her over",
                "Wants banter, not a sales pitch",
            ],
            "best_response": "Offering? Just my undivided attention, and I'm very picky about who gets it.",
            "alternative_responses": {
                "playful": "Depends — you passing the vibe check first or should I go?",
                "direct": "Good company and zero small talk. You in?",
            },
            "coaching_lesson": (
                "Never trade masculine tension for a safe friend-zone pass — hold the frame "
                "and let her lean in."
            ),
        }

    async def complete_text(self, system: str, user: str) -> str:
        await asyncio.sleep(self._latency_seconds)
        persona = _detect_persona(system)
        if "Debate round:" in user:
            return _MOCK_REBUTTALS.get(persona, "No further objections.")
        return _MOCK_OPINIONS.get(persona, "Analysis unavailable for this persona.")


def _detect_persona(system_prompt: str) -> str:
    # Match the prompt's opening ("You are Leo, ...") - persona names also appear
    # in the *bodies* of other agents' prompts (Leo's mentions Arthur and Clara),
    # so a bare substring search misattributes them.
    lowered = system_prompt.lower()
    for persona in ("arthur", "clara", "leo"):
        if f"you are {persona}" in lowered:
            return persona
    return "unknown"


_MOCK_REBUTTALS: dict[str, str] = {
    "arthur": (
        "Clara, agreed it's warm - but warmth is exactly when guys over-give. Leo, keep the "
        "reply short; the frame does the flirting."
    ),
    "clara": (
        "Arthur, don't read the 15-minute gap as a power move - she re-opened the conversation "
        "herself. Leo, lean playful, she's inviting banter, not a negotiation."
    ),
    "leo": (
        "You're both right - so we tease the test instead of answering it. Arthur gets his "
        "scarcity, Clara gets her warmth, and she gets a reason to smile at her phone."
    ),
}

_MOCK_OPINIONS: dict[str, str] = {
    "arthur": (
        "He double-texted after a 42-second reply gap on his side but she took 15 minutes "
        "to respond — investment is currently asymmetric. 'Depends what you're offering' is "
        "a soft compliance test, not rejection. Hold frame: do not over-explain or over-give. "
        "State value once, plainly, and let the silence do the work."
    ),
    "clara": (
        "'hey stranger' is a warm re-opener, not a cold one — she initiated. The compliance "
        "test ('depends what you're offering') is flirtatious probing, checking if he'll "
        "get needy or stay grounded. This reads as genuine interest with a boundary check "
        "attached, not disinterest."
    ),
    "leo": (
        "Play with the test instead of answering it literally — flip it into a callback tease "
        "that keeps the tension light and makes her smile instead of interrogate. Confident, "
        "warm, zero chase energy."
    ),
}
