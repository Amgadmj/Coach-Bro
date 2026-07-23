"""FastAPI gateway.

Single meaningful route: POST /analyze, which streams the swarm pipeline's
DebateEvents over SSE (see docs/architecture.md §4 for why SSE, not a
WebSocket, and CLAUDE.md principle #5 for why this must never collapse into
a single blocking response).
"""

from __future__ import annotations

import io
import os

from dotenv import load_dotenv

load_dotenv()  # backend/.env - keys and mode; must run before any os.environ reads

import pillow_heif
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, UnidentifiedImageError

# Registers a PIL plugin so Image.open() transparently decodes HEIC/HEIF bytes
# (iOS Photo Library / Files app default format) via libheif. Must run once at
# import time, before any Image.open() call touches HEIC bytes.
pillow_heif.register_heif_opener()

from agents.prompts import SUGGEST_SYSTEM_PROMPT, build_suggest_user_prompt
from llm_clients.base import LLMClient, MockLLMClient
from markdown_format import conversation_to_markdown
from memory.store import get_memory_store
from models.schemas import (
    LANGUAGE_NAMES,
    ContactSummary,
    ExtractResponse,
    Gender,
    MemoryRecord,
    SetMatchGenderRequest,
    SocialMode,
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
# Fires far more often than a deliberate /analyze Send - once per screenshot
# attach/remove on the Live screen, not once per read - so it gets its own,
# separate budget rather than sharing analyze_limiter's.
extract_limiter = RateLimiter(
    max_requests=int(os.environ.get("EXTRACT_RATE_LIMIT_PER_HOUR", "40")), window_seconds=3600
)

# Not literally "unlimited": each image adds real tokens/cost to the vision call,
# and this is a user-controlled upload boundary, so a generous but finite safety
# cap belongs here regardless of what the UI allows. Raise via env if needed.
MAX_IMAGES_PER_ANALYZE = int(os.environ.get("MAX_IMAGES_PER_ANALYZE", "20"))

# Anthropic's vision API only decodes these four - anything else (BMP/TIFF, or
# a browser sending no content-type at all) used to sail straight through
# main.py's `content_type or "image/jpeg"` fallback and fail deep inside the
# Anthropic call instead, surfacing as one generic "something went wrong"
# error event for the whole read with no indication of which file or why.
# Reject it here instead, before the SSE stream (and the LLM spend) even starts.
ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}

# HEIC/HEIF (the default format for iOS Photo Library / Files app picks) is not
# one of Anthropic's four directly-decodable types, but unlike BMP/TIFF it's not
# genuinely undecodable - pillow-heif lets us transcode it to JPEG in-memory
# below before it ever reaches the vision client. Accepted as input, never
# forwarded as-is.
HEIC_CONTENT_TYPES = {"image/heic", "image/heif"}

# Filename-extension fallback for uploads whose content-type is missing or
# generic ("application/octet-stream") - seen live from browser clipboard
# pastes and some multipart clients that never set a real image content-type
# even though the bytes decode fine. A genuinely undecodable format (BMP,
# TIFF) still gets rejected below regardless of extension, since Anthropic's
# vision API can't decode those no matter what mime type we claim.
_EXTENSION_TO_MIME = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "webp": "image/webp",
    "heic": "image/heic",
    "heif": "image/heif",
}
_GENERIC_CONTENT_TYPES = {None, "", "application/octet-stream"}

# Pasted/typed conversation text - a generous cap since a real chat paste can run
# long, but still a finite user-controlled boundary before it reaches the LLM.
MAX_TEXT_CONTENT_CHARS = int(os.environ.get("MAX_TEXT_CONTENT_CHARS", "4000"))


def _resolve_image_content_type(filename: str | None, content_type: str | None) -> str | None:
    """Returns the content type to trust for this upload, or None if it should
    be rejected. Passes known-good types through as-is; for a missing/generic
    content type, falls back to sniffing the filename extension."""
    if content_type in ALLOWED_IMAGE_CONTENT_TYPES or content_type in HEIC_CONTENT_TYPES:
        return content_type
    if content_type in _GENERIC_CONTENT_TYPES and filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        return _EXTENSION_TO_MIME.get(ext)
    return None


def _convert_heic_to_jpeg(data: bytes) -> bytes:
    """Decodes HEIC/HEIF bytes (via the pillow-heif opener registered above)
    and re-encodes as JPEG, entirely in memory - never touches disk, per
    CLAUDE.md's "don't persist raw screenshots" privacy rule. Raises
    ValueError with a user-facing message if the bytes don't actually decode
    (e.g. a corrupt file that merely claims to be HEIC)."""
    try:
        with Image.open(io.BytesIO(data)) as image:
            rgb_image = image.convert("RGB")
            buffer = io.BytesIO()
            rgb_image.save(buffer, format="JPEG")
            return buffer.getvalue()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError(f"Could not decode HEIC/HEIF image: {exc}") from exc


async def _prepare_images(images: list[UploadFile]) -> list[tuple[bytes, str]]:
    """Validates and normalizes uploaded images into (bytes, mime_type) pairs the
    vision client can actually decode - shared by /analyze and /extract so both
    apply the same size cap, content-type check, and in-memory HEIC transcode
    instead of duplicating this per route. Raises HTTPException on any problem."""
    if len(images) > MAX_IMAGES_PER_ANALYZE:
        raise HTTPException(
            status_code=400,
            detail=f"Too many screenshots in one go - max {MAX_IMAGES_PER_ANALYZE} per read.",
        )

    image_data: list[tuple[bytes, str]] = []
    for img in images:
        resolved_type = _resolve_image_content_type(img.filename, img.content_type)
        if resolved_type is None:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unsupported image type '{img.content_type or 'unknown'}' "
                    f"({img.filename or 'unnamed file'}) - please upload JPEG, PNG, GIF, WebP, or HEIC/HEIF screenshots."
                ),
            )
        raw_bytes = await img.read()
        if resolved_type in HEIC_CONTENT_TYPES:
            # Transcode to JPEG server-side so the vision client (and every
            # downstream stage) only ever sees a format Anthropic can decode -
            # never raw HEIC bytes. In-memory only; nothing touches disk.
            try:
                raw_bytes = _convert_heic_to_jpeg(raw_bytes)
            except ValueError as exc:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"Could not read '{img.filename or 'unnamed file'}' as a HEIC/HEIF image - "
                        f"the file may be corrupt. ({exc})"
                    ),
                ) from exc
            resolved_type = "image/jpeg"
        image_data.append((raw_bytes, resolved_type))
    return image_data


async def get_device_id(x_device_id: str | None = Header(default=None)) -> str:
    """This app has no auth system - `contacts`/`reads`/`user_style` used to be
    global tables with zero per-user scoping, so a `contact_id` (a plain
    client-chosen string, e.g. a lowercased name) could collide across
    completely different people, and `GET /contacts` returned every contact
    ever created by anyone. Confirmed live: different users were seeing each
    other's reads.

    The fix is a client-generated, localStorage-persisted device ID (see
    web/src/lib/deviceId.ts / mobile/src/deviceId.ts) sent on every request
    that touches memory, used to scope every contact/read/style row to the
    device that created it. Deliberately NOT the request's IP address - IP is
    shared behind NAT/CGNAT (would leak across unrelated people on the same
    network) and changes across networks (would make a single real user's own
    data seem to disappear) - IP keeps its existing, unrelated job of
    rate-limiting only (see RateLimiter in rate_limit.py).

    Required, not optional: a missing header is rejected outright rather than
    falling back to some shared default, which would just reintroduce the bug
    for anyone whose client failed to send it."""
    if not x_device_id or not x_device_id.strip():
        raise HTTPException(status_code=400, detail="Missing X-Device-Id header.")
    return x_device_id.strip()


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
    images: list[UploadFile] = File(default=[]),
    text_content: str | None = Form(default=None),
    contact_id: str | None = Form(default=None),
    language: SupportedLanguage = Form(default="auto"),
    mode: SocialMode = Form(default="hype"),
    # Resolved client-side before the request is sent (per-contact match_gender
    # override, or the session's interestedIn default - see
    # web/src/app/live/page.tsx's submit()) - the backend just uses whatever
    # single value it's given, same precedent as language/mode. None for
    # either falls back to neutral they/them framing, never guessed.
    user_gender: Gender | None = Form(default=None),
    match_gender: Gender | None = Form(default=None),
    device_id: str = Depends(get_device_id),
) -> StreamingResponse:
    text_content = text_content.strip() if text_content else None

    if not images and not text_content:
        raise HTTPException(status_code=400, detail="Attach at least one screenshot or enter some text.")
    if text_content and len(text_content) > MAX_TEXT_CONTENT_CHARS:
        raise HTTPException(
            status_code=400,
            detail=f"Pasted text is too long - max {MAX_TEXT_CONTENT_CHARS} characters.",
        )

    image_data = await _prepare_images(images)

    orchestrator = get_orchestrator()

    async def event_stream():
        async for event in orchestrator.run_pipeline(
            image_data or None,
            contact_id,
            device_id,
            language,
            mode,
            text_content=text_content,
            user_gender=user_gender,
            match_gender=match_gender,
        ):
            yield f"data: {event.model_dump_json()}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@app.post("/extract", dependencies=[Depends(extract_limiter)])
async def extract(images: list[UploadFile] = File(...)) -> ExtractResponse:
    """Vision-extraction-only preview, fired the moment a screenshot is attached
    on the Live screen - not at Send. Reuses the exact same vision_extract call
    /analyze's pipeline makes as its first stage (see swarm_orchestrator.py::
    SwarmOrchestrator._extract_context), so the user can see and fix the
    transcript before spending a full debate on it. Stateless: no memory write,
    no contact linkage - screenshots are processed in-memory and discarded here
    exactly like /analyze (CLAUDE.md's no-raw-screenshot-persistence rule).
    """
    if not images:
        raise HTTPException(status_code=400, detail="Attach at least one screenshot.")

    image_data = await _prepare_images(images)
    vision_client, _ = _build_llm_clients()
    context = await vision_client.vision_extract(image_data)
    return ExtractResponse(context=context, markdown=conversation_to_markdown(context))


@app.post("/suggest", dependencies=[Depends(suggest_limiter)])
async def suggest(request: SuggestRequest, device_id: str = Depends(get_device_id)) -> SuggestResponse:
    """Text-only scenario -> three suggested openers. No debate, no memory write -
    the lighter sibling of /analyze for when there's no screenshot yet."""
    # No screenshot to detect a language from. "auto" sends no directive at all
    # (see build_suggest_user_prompt) so the model mirrors the scenario's language
    # on its own - live-testing showed a self-referential "detect and match the
    # language below" instruction is unreliable and can misfire to a third language.
    response_language = None if request.language == "auto" else LANGUAGE_NAMES[request.language]
    user_style = await get_memory_store().get_user_style(device_id)

    vision_client, _ = _build_llm_clients()
    data = await vision_client.complete_json(
        SUGGEST_SYSTEM_PROMPT,
        build_suggest_user_prompt(
            request.scenario, request.mode, response_language, user_style, request.category, request.seed
        ),
        SuggestResponse.model_json_schema(),
    )
    return SuggestResponse.model_validate(data)


@app.get("/contacts")
async def list_contacts(device_id: str = Depends(get_device_id)) -> list[ContactSummary]:
    store = get_memory_store()
    return await store.list_contacts(device_id)


@app.get("/contacts/{contact_id}/history")
async def contact_history(
    contact_id: str, device_id: str = Depends(get_device_id)
) -> list[MemoryRecord]:
    store = get_memory_store()
    return await store.get_contact_history(device_id, contact_id)


@app.patch("/contacts/{contact_id}")
async def set_contact_gender(
    contact_id: str,
    request: SetMatchGenderRequest,
    device_id: str = Depends(get_device_id),
) -> dict[str, str]:
    """Sets a specific contact's gender - separate from the app user's own
    gender, which lives client-side and is sent per-request (see
    models.schemas.Gender). A single user may be dating people of more than
    one gender, so this is per-contact rather than a single global default -
    see web/src/app/live/page.tsx's "+ New" contact flow, which calls this
    right after naming a new contact."""
    store = get_memory_store()
    await store.upsert_match_gender(device_id, contact_id, request.match_gender)
    return {"status": "ok"}


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
