"""Single source of truth for the API contract.

`mobile/src/types/schemas.ts` hand-mirrors these models — update both together.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

AgentName = Literal["arthur", "clara", "leo"]


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


class AgentOpinion(BaseModel):
    agent: AgentName
    analysis: str
    key_points: list[str]
    suggested_response: str | None = None


class AlternativeResponses(BaseModel):
    playful: str
    direct: str


class SynthesisResult(BaseModel):
    attraction_level: int = Field(ge=1, le=10)
    dynamic_analysis: str
    what_she_is_thinking: list[str]
    best_response: str
    alternative_responses: AlternativeResponses
    coaching_lesson: str

    @field_validator("what_she_is_thinking", mode="before")
    @classmethod
    def _coerce_single_string_to_list(cls, v: object) -> object:
        # Forced tool-use models occasionally collapse a short list field into a
        # single string despite the array schema (seen live with claude-sonnet-5).
        # Wrap rather than reject - a one-item read is still a valid read.
        if isinstance(v, str):
            return [v]
        return v


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


class Suggestion(BaseModel):
    label: str
    text: str


class SuggestResponse(BaseModel):
    suggestions: list[Suggestion] = Field(min_length=3, max_length=3)


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
