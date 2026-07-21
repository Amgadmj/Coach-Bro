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
            detected_language="English",
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
                "language": "English",
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
        if "PERSONA UPDATE" in user:
            reads = 1 if "(first read - no persona yet)" in user else 2
            return (
                "Style: playful, replies warm up once teased back; light emoji use.\n"
                "Running topics: her favorite book (callback available), late-night coffee.\n"
                "Tests: compliance checks ('depends what you're offering') - responds well "
                "when he holds frame with humor.\n"
                f"Trend: warming across {reads} read(s). Works: playful misdirection. "
                "Flopped: over-explaining."
            )
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
    "arthur": "Clara, agreed it's warm, but Leo, keep the reply short - the frame does the flirting.",
    "clara": "Arthur, that gap's not a power move, she re-opened the conversation herself.",
    "leo": "You're both right, so let's tease the test instead of answering it directly.",
}

# HEADLINE: format matches the real prompt contract (see agents/prompts.py
# _CHAT_OUTPUT_FORMAT) so the mock path exercises the same parsing as production.
_MOCK_OPINIONS: dict[str, str] = {
    "arthur": (
        "HEADLINE: Investment's asymmetric right now - hold the frame, don't chase.\n\n"
        "He double-texted after a 42-second gap but she took 15 minutes to reply. "
        "'Depends what you're offering' is a soft compliance test, not rejection. "
        "State value once, plainly, and let the silence do the work."
    ),
    "clara": (
        "HEADLINE: She's testing whether he'll get needy, not shutting him down.\n\n"
        "'Hey stranger' is a warm re-opener, not a cold one - she initiated. The compliance "
        "test is flirtatious probing. This reads as genuine interest with a boundary "
        "check attached."
    ),
    "leo": (
        "HEADLINE: Flip the test into a callback tease instead of answering it straight.\n\n"
        "Keep the tension light and make her smile instead of interrogate. "
        "Confident, warm, zero chase energy."
    ),
}
