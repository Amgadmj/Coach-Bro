"""Provider-agnostic LLM client seam.

Every real provider integration (Anthropic, Groq, Gemini, ...) implements
`LLMClient`. Nothing in `swarm_orchestrator.py` or `main.py` should ever
import a provider SDK directly - see CLAUDE.md principle #2.
"""

from __future__ import annotations

import asyncio
import re
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

    async def vision_extract(self, images: list[tuple[bytes, str]]) -> ConversationContext: ...

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]: ...

    async def complete_text(self, system: str, user: str) -> str: ...


# The canned fixture text below is written with he/him/his always referring
# to the user and she/her always referring to the match (matching the
# assumption the real prompts used to hardcode) - _apply_pronouns_deep
# rewrites those words using whatever pronouns the real prompt's PRONOUNS
# line (see agents/prompts.py::_pronoun_header) actually asked for, so the
# mock demonstrates gender-adaptive output too, not just the real LLM client.
# Falls back to the original he=user/she=match assignment when no PRONOUNS
# line is present (e.g. a test calling complete_text/complete_json directly).
_PRONOUN_LINE_RE = re.compile(
    r"PRONOUNS: the user is (\w+)/(\w+)/(\w+); the match is (\w+)/(\w+)/(\w+)\."
)


def _pronouns_from_prompt(user: str) -> tuple[dict[str, str], dict[str, str]]:
    match = _PRONOUN_LINE_RE.search(user)
    if not match:
        return (
            {"subject": "he", "object": "him", "possessive": "his"},
            {"subject": "she", "object": "her", "possessive": "her"},
        )
    u_subj, u_obj, u_poss, m_subj, m_obj, m_poss = match.groups()
    return (
        {"subject": u_subj, "object": u_obj, "possessive": u_poss},
        {"subject": m_subj, "object": m_obj, "possessive": m_poss},
    )


def _reflexive(pronoun_set: dict[str, str]) -> str:
    if pronoun_set["subject"] == "he":
        return "himself"
    if pronoun_set["subject"] == "she":
        return "herself"
    return "themself"


_PRONOUN_TOKEN_RE = re.compile(r"\b(herself|she|her|he|him|his)\b", re.IGNORECASE)


def _apply_pronouns(text: str, user_p: dict[str, str], match_p: dict[str, str]) -> str:
    """Single-pass token substitution, good enough for canned demo/mock text -
    not aiming for perfect grammar in every possible sentence. Must be one
    pass, not several sequential re.sub calls: when a role's pronoun set
    overlaps with another role's original words (e.g. match=male produces
    "him", the same word user=female's pass would also try to consume),
    sequential substitution corrupts an already-substituted word - confirmed
    live via test_gender_pronouns.py before this was made single-pass."""

    def replace(m: re.Match[str]) -> str:
        word = m.group(1)
        lower = word.lower()
        if lower == "herself":
            replacement = _reflexive(match_p)
        elif lower == "she":
            replacement = match_p["subject"]
        elif lower == "her":
            # Ambiguous in English (object or possessive) - object is the more
            # common case in this fixture text; the one known possessive case
            # ("her favorite book") is phrased to avoid the pronoun entirely.
            replacement = match_p["object"]
        elif lower == "he":
            replacement = user_p["subject"]
        elif lower == "him":
            replacement = user_p["object"]
        elif lower == "his":
            replacement = user_p["possessive"]
        else:
            return word
        return replacement.capitalize() if word[0].isupper() else replacement

    return _PRONOUN_TOKEN_RE.sub(replace, text)


def _apply_pronouns_deep(value: Any, user_p: dict[str, str], match_p: dict[str, str]) -> Any:
    if isinstance(value, str):
        return _apply_pronouns(value, user_p, match_p)
    if isinstance(value, list):
        return [_apply_pronouns_deep(v, user_p, match_p) for v in value]
    if isinstance(value, dict):
        return {k: _apply_pronouns_deep(v, user_p, match_p) for k, v in value.items()}
    return value


class MockLLMClient:
    """Deterministic, fixture-backed LLMClient. No network calls, no API keys.

    Used for local development and as the fixture in
    `backend/scripts/run_pipeline_mock.py` / `backend/tests/test_orchestrator_mock.py`.
    """

    def __init__(self, latency_seconds: float = 0.05) -> None:
        self._latency_seconds = latency_seconds

    async def vision_extract(self, images: list[tuple[bytes, str]]) -> ConversationContext:
        await asyncio.sleep(self._latency_seconds)
        return ConversationContext(
            contact_id=None,
            extracted_at=datetime.now(timezone.utc),
            detected_language="English",
            messages=[
                Message(sender="match", text="hey stranger 👀", response_lag_seconds=None),
                Message(
                    sender="user",
                    text="just thinking about you, wyd",
                    response_lag_seconds=42.0,
                    reactions=["❤️"],
                ),
                Message(
                    sender="match",
                    text="",
                    message_type="voice_note",
                    duration_seconds=14.0,
                    response_lag_seconds=180.0,
                ),
                Message(sender="match", text="hmm maybe. depends what you're offering", response_lag_seconds=910.0),
            ],
        )

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]:
        await asyncio.sleep(self._latency_seconds)
        properties = json_schema.get("properties", {})
        if "suggestions" in properties:
            return {
                "language": "English",
                "suggestions": [
                    {"label": "Be bold", "text": "What's the craziest thing you've done tonight?"},
                    {"label": "Playful tease", "text": "You look like trouble, in a good way."},
                    {"label": "Direct", "text": "I'm glad I came over to talk to you."},
                ]
            }
        if "messages" in properties:
            # Text-only extraction (no screenshot) - see
            # swarm_orchestrator.py::_extract_text_context.
            return {
                "contact_id": None,
                "detected_language": "English",
                "messages": [
                    {"sender": "match", "text": "hey! saw you're into hiking too", "response_lag_seconds": None},
                    {"sender": "user", "text": "yeah I try to get out most weekends, you?", "response_lag_seconds": 60.0},
                    {"sender": "match", "text": "same! we should compare trail notes sometime", "response_lag_seconds": 420.0},
                ],
            }
        user_p, match_p = _pronouns_from_prompt(user)
        return _apply_pronouns_deep(
            {
                "attraction_level": 7,
                "dynamic_summary": "She's testing if you'll chase, not shutting things down.",
                "dynamic_analysis": (
                    "She's throwing a light compliance test ('depends what you're offering') "
                    "rather than shutting the conversation down. Engagement is genuine but she "
                    "wants to see if you chase."
                ),
                "what_they_are_thinking": [
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
            },
            user_p,
            match_p,
        )

    async def complete_text(self, system: str, user: str) -> str:
        await asyncio.sleep(self._latency_seconds)
        if "Previous voice profile:" in user:
            first_read = "(no profile yet - this is the first evidence)" in user
            return (
                "Casual and warm, lowercase-heavy, likes short punchy lines over long "
                "paragraphs. Leans playful/teasing rather than sincere-by-default; "
                "comfortable with a bit of confident dryness."
                if first_read
                else "Casual and warm, lowercase-heavy, short punchy lines, playful/teasing "
                "tone confirmed across multiple reads; comfortable with confident dryness."
            )
        if "PERSONA UPDATE" in user:
            reads = 1 if "(first read - no persona yet)" in user else 2
            user_p, match_p = _pronouns_from_prompt(user)
            return _apply_pronouns(
                "Style: playful, replies warm up once teased back; light emoji use.\n"
                "Running topics: the match's favorite book (callback available), late-night coffee.\n"
                "Tests: compliance checks ('depends what you're offering') - responds well "
                "when he holds frame with humor.\n"
                f"Trend: warming across {reads} read(s). Works: playful misdirection. "
                "Flopped: over-explaining.",
                user_p,
                match_p,
            )
        persona = _detect_persona(system)
        user_p, match_p = _pronouns_from_prompt(user)
        if "Debate round:" in user:
            return _apply_pronouns(_MOCK_REBUTTALS.get(persona, "No further objections."), user_p, match_p)
        return _apply_pronouns(
            _MOCK_OPINIONS.get(persona, "Analysis unavailable for this persona."), user_p, match_p
        )


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
