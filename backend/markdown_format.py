"""Pure formatting: ConversationContext -> a human-readable Markdown transcript.

No LLM calls here - this is plain data transformation, so it behaves identically
whether the ConversationContext came from MockLLMClient or a real vision_extract
call (see llm_clients/anthropic_client.py). Used by POST /extract (main.py) to
give the user an editable preview of what got read off their screenshot(s)
before the real debate pipeline ever runs - see web/src/app/live/page.tsx.
"""

from __future__ import annotations

from models.schemas import ConversationContext, Message

_SENDER_LABELS = {"user": "You", "match": "Match"}

_MESSAGE_TYPE_LABELS = {
    "voice_note": "🎤 voice note",
    "image": "🖼️ image",
    "gif": "🎞️ gif",
    "sticker": "😀 sticker",
    "video": "🎬 video",
    "other": "📎 attachment",
}


def _format_lag(seconds: float) -> str:
    """"42s later" / "3m later" / "2h later" / "1d later" - coarse, human-scale
    buckets matching the granularity a person would actually estimate from a
    screenshot (see agents/prompts.py::EXTRACTION_PROMPT's own instruction)."""
    total = max(0, int(seconds))
    if total < 60:
        return f"{total}s later"
    minutes = total // 60
    if minutes < 60:
        return f"{minutes}m later"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h later"
    days = hours // 24
    return f"{days}d later"


def _format_duration(seconds: float | None) -> str:
    if seconds is None:
        return ""
    total = max(0, int(seconds))
    return f"{total // 60}:{total % 60:02d}"


def _message_body(message: Message) -> str:
    if message.message_type == "text":
        return message.text or "(empty message)"
    label = _MESSAGE_TYPE_LABELS.get(message.message_type, "📎 attachment")
    if message.message_type == "voice_note":
        duration = _format_duration(message.duration_seconds)
        if duration:
            label = f"{label} ({duration})"
    if message.text:
        label = f"{label} — {message.text}"
    return label


def _message_meta(message: Message) -> str:
    parts: list[str] = []
    if message.timestamp:
        parts.append(message.timestamp)
    elif message.response_lag_seconds is not None:
        parts.append(_format_lag(message.response_lag_seconds))
    if message.reactions:
        parts.append(f"{' '.join(message.reactions)} reacted")
    return " · ".join(parts)


def conversation_to_markdown(context: ConversationContext) -> str:
    """Renders a ConversationContext as an editable Markdown transcript. Empty
    string (no lines at all) if there were no messages to extract - callers
    should treat that the same as an extraction failure, not a valid preview."""
    lines: list[str] = []
    if context.detected_language:
        lines.append(f"**Detected language:** {context.detected_language}")
        lines.append("")

    for message in context.messages:
        sender = _SENDER_LABELS.get(message.sender, message.sender)
        meta = _message_meta(message)
        lines.append(f"**{sender}** — {meta}" if meta else f"**{sender}**")
        lines.append(_message_body(message))
        lines.append("")

    return "\n".join(lines).rstrip("\n")
