"""FastAPI gateway.

Single meaningful route: POST /analyze, which streams the swarm pipeline's
DebateEvents over SSE (see docs/architecture.md §4 for why SSE, not a
WebSocket, and CLAUDE.md principle #5 for why this must never collapse into
a single blocking response).
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()  # backend/.env - keys and mode; must run before any os.environ reads

from fastapi import Depends, FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.prompts import SUGGEST_SYSTEM_PROMPT, build_suggest_user_prompt
from llm_clients.base import LLMClient, MockLLMClient
from memory.store import get_memory_store
from models.schemas import (
    LANGUAGE_NAMES,
    ContactSummary,
    MemoryRecord,
    SuggestRequest,
    SuggestResponse,
    SupportedLanguage,
)
from rate_limit import RateLimiter
from swarm_orchestrator import SwarmOrchestrator

app = FastAPI(title="RESET AI backend")

# Comma-separated origins in prod (e.g. "https://brocoach.app"); "*" only for local dev.
_origins = [o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Per-IP limits on the two routes that spend LLM tokens. In-memory, so per-instance -
# good enough for a single-instance MVP; swap for Redis when horizontally scaling.
analyze_limiter = RateLimiter(
    max_requests=int(os.environ.get("ANALYZE_RATE_LIMIT_PER_HOUR", "20")), window_seconds=3600
)
suggest_limiter = RateLimiter(
    max_requests=int(os.environ.get("SUGGEST_RATE_LIMIT_PER_HOUR", "60")), window_seconds=3600
)


def _build_llm_clients() -> tuple[LLMClient, LLMClient]:
    mode = os.environ.get("LLM_MODE", "mock")
    if mode == "mock":
        return MockLLMClient(), MockLLMClient()
    if mode == "real":
        from llm_clients.anthropic_client import AnthropicClient

        vision_client = AnthropicClient()

        # FAST_LLM_PROVIDER also accepts "anthropic": routes the debate agents
        # through the same Claude client as vision/synthesis instead of Groq/Gemini.
        # Pricier per call (CLAUDE.md's cost-routing principle still prefers a cheap
        # provider by default), but it's a real, fully-supported option - useful
        # when Groq/Gemini aren't configured or are rate-limited, and it's a single
        # already-proven-working client with no extra setup.
        debate_provider = os.environ.get("FAST_LLM_PROVIDER", "groq")
        if debate_provider == "anthropic":
            debate_client: LLMClient = vision_client
        else:
            from llm_clients.fast_client import FastLLMClient

            debate_client = FastLLMClient()

        return vision_client, debate_client
    raise ValueError(f"Unknown LLM_MODE={mode!r}, expected 'mock' or 'real'")


def get_orchestrator() -> SwarmOrchestrator:
    vision_client, debate_client = _build_llm_clients()
    return SwarmOrchestrator(
        vision_client=vision_client,
        debate_client=debate_client,
        memory_store=get_memory_store(),
    )


@app.post("/analyze", dependencies=[Depends(analyze_limiter)])
async def analyze(
    image: UploadFile,
    contact_id: str | None = Form(default=None),
    language: SupportedLanguage = Form(default="auto"),
) -> StreamingResponse:
    orchestrator = get_orchestrator()
    image_bytes = await image.read()
    mime_type = image.content_type or "image/jpeg"

    async def event_stream():
        async for event in orchestrator.run_pipeline(image_bytes, mime_type, contact_id, language):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/suggest", dependencies=[Depends(suggest_limiter)])
async def suggest(request: SuggestRequest) -> SuggestResponse:
    """Text-only scenario -> three suggested openers. No debate, no memory write -
    the lighter sibling of /analyze for when there's no screenshot yet."""
    # No screenshot to detect a language from. "auto" sends no directive at all
    # (see build_suggest_user_prompt) so the model mirrors the scenario's language
    # on its own - live-testing showed a self-referential "detect and match the
    # language below" instruction is unreliable and can misfire to a third language.
    response_language = None if request.language == "auto" else LANGUAGE_NAMES[request.language]
    user_style = await get_memory_store().get_user_style()

    vision_client, _ = _build_llm_clients()
    data = await vision_client.complete_json(
        SUGGEST_SYSTEM_PROMPT,
        build_suggest_user_prompt(request.scenario, request.mode, response_language, user_style),
        SuggestResponse.model_json_schema(),
    )
    return SuggestResponse.model_validate(data)


@app.get("/contacts")
async def list_contacts() -> list[ContactSummary]:
    store = get_memory_store()
    return await store.list_contacts()


@app.get("/contacts/{contact_id}/history")
async def contact_history(contact_id: str) -> list[MemoryRecord]:
    store = get_memory_store()
    return await store.get_contact_history(contact_id)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
