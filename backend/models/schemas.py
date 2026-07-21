"""Single source of truth for the API contract.

`mobile/src/types/schemas.ts` hand-mirrors these models — update both together.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from text_utils import cap_sentences

AgentName = Literal["arthur", "clara", "leo"]

# "auto" = match whatever language the screenshot/scenario is actually in
# (detected at extraction time, or left to the model for text-only /suggest).
# A specific code forces every AI output into that language regardless of
# the source material's language - see agents/prompts.py::resolve_response_language.
SupportedLanguage = Literal["auto", "en", "es", "ar", "fr", "pt", "hi"]

LANGUAGE_NAMES: dict[str, str] = {
    "en": "English",
    "es": "Spanish",
    "ar": "Arabic",
    "fr": "French",
    "pt": "Portuguese",
    "hi": "Hindi",
}


class Message(BaseModel):
    sender: Literal["user", "match"]
    text: str
    # Verbatim as displayed on-screen ("Today 9:41 PM", "2h ago", "Yesterday") - not
    # parsed to an absolute datetime. Real screenshots show relative/ambiguous times
    # a vision model can't reliably convert without the current date as context, so
    # forcing ISO here just produces validation failures on real (non-mock) input.
    timestamp: str | None = None
    bubble_color: str | None = None
    response_lag_seconds: float | None = None


class ConversationContext(BaseModel):
    contact_id: str | None = None
    messages: list[Message]
    extracted_at: datetime
    # Free-text language name as the model identifies it (e.g. "Spanish", "Egyptian
    # Arabic") - not restricted to SupportedLanguage, since detection can be more
    # specific than the fixed override list. None if the model couldn't tell.
    detected_language: str | None = None


class AgentOpinion(BaseModel):
    agent: AgentName
    # One punchy sentence - always visible in the debate feed's chat bubble.
    headline: str
    # 2-3 sentences of supporting reasoning - shown only on tap/hover expand.
    analysis: str


class AlternativeResponses(BaseModel):
    playful: str
    direct: str


class SynthesisResult(BaseModel):
    attraction_level: int = Field(ge=1, le=10)
    # One short punchy sentence - always visible under the Attraction Gauge.
    # Declared before dynamic_analysis so forced tool-use commits to the
    # headline first, same ordering trick used for SuggestResponse.language.
    dynamic_summary: str = Field(
        description="ONE short punchy sentence (under 90 characters) - the headline verdict "
        "shown under the gauge. Never restated inside dynamic_analysis."
    )
    dynamic_analysis: str = Field(
        description="2-3 sentences of supporting detail, shown only if the user taps to "
        "expand - do not repeat dynamic_summary verbatim."
    )
    what_she_is_thinking: list[str]
    best_response: str
    alternative_responses: AlternativeResponses
    coaching_lesson: str = Field(
        description="2-3 sentences, phrased in the USER's own texting voice/register (see "
        "the user voice profile in the prompt, if provided) - not generic coaching-speak."
    )

    @field_validator("what_she_is_thinking", mode="before")
    @classmethod
    def _coerce_single_string_to_list(cls, v: object) -> object:
        # Forced tool-use models occasionally collapse a short list field into a
        # single string despite the array schema (seen live with claude-sonnet-5).
        # Wrap rather than reject - a one-item read is still a valid read.
        if isinstance(v, str):
            return [v]
        return v

    # Defensive caps, same rationale as the debate room's headline/detail split:
    # prompt-only length instructions have proven unreliable across providers in
    # live testing, so these run regardless of what the model actually returned.
    @field_validator("dynamic_summary", mode="after")
    @classmethod
    def _cap_summary(cls, v: str) -> str:
        return cap_sentences(v, max_sentences=1, max_chars=110)

    @field_validator("dynamic_analysis", mode="after")
    @classmethod
    def _cap_analysis(cls, v: str) -> str:
        return cap_sentences(v, max_sentences=3, max_chars=500)

    @field_validator("coaching_lesson", mode="after")
    @classmethod
    def _cap_lesson(cls, v: str) -> str:
        return cap_sentences(v, max_sentences=3, max_chars=400)


class DebateEvent(BaseModel):
    type: Literal[
        "extraction_started",
        "extraction_done",
        "agent_started",
        "agent_done",
        "agent_reply",
        "synthesis_started",
        "synthesis_done",
        "memory_updated",
        "error",
    ]
    agent: AgentName | None = None
    payload: dict[str, Any] | None = None


class AnalyzeRequest(BaseModel):
    contact_id: str | None = None


class AnalyzeResponse(BaseModel):
    session_id: str
    result: SynthesisResult


SocialMode = Literal["hype", "chill", "romantic", "direct"]


class SuggestRequest(BaseModel):
    scenario: str = Field(min_length=1, max_length=2000)
    mode: SocialMode = "hype"
    language: SupportedLanguage = "auto"


class Suggestion(BaseModel):
    # Field-level descriptions matter here, not just prompt prose: forced tool-use
    # was observed live writing `text` in English but `label` in Portuguese for the
    # same response with no language override active - a schema-level reminder,
    # scoped to the exact field, is more reliable than a paragraph elsewhere.
    label: str = Field(description="Short 1-3 word category tag, in the exact same language as `text`.")
    text: str = Field(description="The actual suggested line to say out loud.")


class SuggestResponse(BaseModel):
    # Declared BEFORE suggestions deliberately: forced tool-use fills schema fields
    # in order, so committing to a language here first measurably steers the
    # suggestions that follow - live-tested after plain "respond in English" prose
    # elsewhere in the prompt proved unreliable (a neutral English scenario in
    # "romantic" mode came back in French on 3/3 repeated attempts).
    language: str = Field(
        description="The language you detected the scenario is written in (e.g. 'English', "
        "'Spanish') - or the explicitly requested language if one was given. Every "
        "suggestion's label and text below must be written in this exact language."
    )
    suggestions: list[Suggestion] = Field(min_length=3, max_length=3)

    @field_validator("language", mode="before")
    @classmethod
    def _default_missing_language_to_english(cls, v: object) -> object:
        return v or "English"


class MemoryRecord(BaseModel):
    contact_id: str
    session_id: str | None = None
    summary: str
    created_at: datetime


class ContactSummary(BaseModel):
    id: str
    display_name: str
    session_count: int
    last_interaction_at: datetime | None = None
