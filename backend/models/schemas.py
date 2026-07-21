"""Single source of truth for the API contract.

`mobile/src/types/schemas.ts` hand-mirrors these models — update both together.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

AgentName = Literal["arthur", "clara", "leo"]


class Message(BaseModel):
    sender: Literal["user", "match"]
    text: str
    timestamp: datetime | None = None
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


class DebateEvent(BaseModel):
    type: Literal[
        "extraction_started",
        "extraction_done",
        "agent_started",
        "agent_done",
        "synthesis_started",
        "synthesis_done",
        "error",
    ]
    agent: AgentName | None = None
    payload: dict[str, Any] | None = None


class AnalyzeRequest(BaseModel):
    contact_id: str | None = None


class AnalyzeResponse(BaseModel):
    session_id: str
    result: SynthesisResult


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
