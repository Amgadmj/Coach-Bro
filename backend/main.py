"""FastAPI gateway.

Single meaningful route: POST /analyze, which streams the swarm pipeline's
DebateEvents over SSE (see docs/architecture.md §4 for why SSE, not a
WebSocket, and CLAUDE.md principle #5 for why this must never collapse into
a single blocking response).
"""

from __future__ import annotations

import os

from fastapi import FastAPI, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from llm_clients.base import LLMClient, MockLLMClient
from memory.store import get_memory_store
from models.schemas import ContactSummary, MemoryRecord
from swarm_orchestrator import SwarmOrchestrator

app = FastAPI(title="RESET AI backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # dev-only; scope this down before shipping a real deployment
    allow_methods=["*"],
    allow_headers=["*"],
)


def _build_llm_clients() -> tuple[LLMClient, LLMClient]:
    mode = os.environ.get("LLM_MODE", "mock")
    if mode == "mock":
        return MockLLMClient(), MockLLMClient()
    if mode == "real":
        from llm_clients.anthropic_client import AnthropicClient
        from llm_clients.fast_client import FastLLMClient

        return AnthropicClient(), FastLLMClient()
    raise ValueError(f"Unknown LLM_MODE={mode!r}, expected 'mock' or 'real'")


def get_orchestrator() -> SwarmOrchestrator:
    vision_client, debate_client = _build_llm_clients()
    return SwarmOrchestrator(
        vision_client=vision_client,
        debate_client=debate_client,
        memory_store=get_memory_store(),
    )


@app.post("/analyze")
async def analyze(image: UploadFile, contact_id: str | None = Form(default=None)) -> StreamingResponse:
    orchestrator = get_orchestrator()
    image_bytes = await image.read()
    mime_type = image.content_type or "image/jpeg"

    async def event_stream():
        async for event in orchestrator.run_pipeline(image_bytes, mime_type, contact_id):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


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
