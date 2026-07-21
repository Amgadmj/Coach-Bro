"""Anthropic-backed LLMClient: vision extraction + synthesis.

Uses forced tool-use (not prefill, not a hoped-for "JSON mode" flag) as the
structured-output mechanism - the most stable way to get schema-conformant
JSON out of Claude across SDK versions. The tool is never actually invoked;
its `input_schema` is the contract we want back, and `tool_choice` forces
the model to always call it.
"""

from __future__ import annotations

import base64
import json
import os
from datetime import datetime, timezone
from typing import Any

from anthropic import AsyncAnthropic

from models.schemas import ConversationContext

DEFAULT_VISION_MODEL = "claude-sonnet-5"
MAX_TOKENS = 2048
# Extraction merges however many screenshots were uploaded into one message
# list - needs more headroom than a single-call analysis/synthesis response.
EXTRACTION_MAX_TOKENS = 4096

EXTRACTION_PROMPT = """\
Look at the attached chat screenshot(s) - there may be one or several, e.g. because the user \
scrolled up to capture more of the conversation. Extract every message as ONE single, \
chronologically ordered list:

- If there is more than one screenshot, merge them into a single conversation. They are NOT \
necessarily attached in chronological order - use the actual conversation flow, visible \
timestamps, and content logic (a reply follows what it replies to) to determine the true order, \
never assume attachment order is correct.
- Screenshots of the same scrolling conversation commonly overlap (the same bubble visible in \
two consecutive caps). Recognize and de-duplicate repeated messages - each real message should \
appear exactly once in the output, no matter how many screenshots it appears in.
- sender: "user" if the bubble is the phone owner's own outgoing message (usually right-aligned \
/ blue/dark bubble), "match" if it's the other person's incoming message (usually left-aligned \
/ grey/light bubble). Sender alignment/color is consistent across all screenshots of the same chat.
- text: the exact message text, transcribed verbatim in its ORIGINAL language and script - \
never translate it here, this is a literal transcription step. For a non-text bubble (voice \
note, image, sticker, gif, video) that has no caption, use an empty string.
- timestamp: if visible, else omit.
- bubble_color: the visible bubble color/style if distinguishable, else omit.
- response_lag_seconds: estimated seconds since the prior message if a time gap is visible \
(e.g. "2 hours ago" between bubbles), else omit.
- message_type: "text" for an ordinary typed bubble. "voice_note" for a voice memo bubble - \
these show a waveform/soundwave shape with a play button and a duration, you cannot hear the \
audio but you can and must still record that one was sent. "image"/"gif"/"video" for inline \
media bubbles. "sticker" for a sticker/GIF-keyboard send. "other" for anything else \
non-textual. Default "text" if unsure.
- duration_seconds: for message_type "voice_note" only, the duration shown on the bubble \
(e.g. "0:14" -> 14), else omit.
- reactions: any emoji reactions/tapbacks attached to that specific message - iMessage shows \
these as a small emoji badge overlapping the corner of the bubble (heart, thumbs up/down, ha-ha, \
!!, ?); WhatsApp/Instagram/etc show a small emoji chip below or beside the bubble. List every \
reacted emoji exactly as shown, e.g. ["❤️"] or ["😂", "👍"]. Empty list if none. Do not confuse \
these with emoji typed as part of the message text itself.
- detected_language: the specific language (and dialect/region if identifiable, e.g. "Mexican \
Spanish", "Egyptian Arabic") the conversation is actually written in. Judge this from the message \
text itself, not the phone's UI chrome. If the conversation mixes languages, name the dominant one.

Call the record_conversation tool with the extracted data.
"""


class AnthropicClient:
    def __init__(self, api_key: str | None = None, vision_model: str | None = None) -> None:
        self._client = AsyncAnthropic(api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self._model = vision_model or os.environ.get("ANTHROPIC_VISION_MODEL", DEFAULT_VISION_MODEL)

    async def vision_extract(self, images: list[tuple[bytes, str]]) -> ConversationContext:
        """`images` is one or more (image_bytes, mime_type) pairs - all screenshots
        from a single /analyze call, sent to Claude in one message so it can merge
        and de-duplicate across them (see EXTRACTION_PROMPT)."""
        schema = ConversationContext.model_json_schema()
        # extracted_at is filled in locally, not by the model - drop it from what we ask for.
        schema["properties"].pop("extracted_at", None)
        if "required" in schema:
            schema["required"] = [f for f in schema["required"] if f != "extracted_at"]

        image_blocks: list[dict[str, Any]] = [
            {
                "type": "image",
                "source": {"type": "base64", "media_type": mime_type, "data": base64.b64encode(image_bytes).decode("ascii")},
            }
            for image_bytes, mime_type in images
        ]

        raw = await self._call_tool(
            system="You extract structured chat data from screenshots precisely and literally.",
            content=[*image_blocks, {"type": "text", "text": EXTRACTION_PROMPT}],
            tool_name="record_conversation",
            tool_description="Record the structured messages extracted from the screenshot(s).",
            schema=schema,
            max_tokens=EXTRACTION_MAX_TOKENS,
        )
        raw["extracted_at"] = datetime.now(timezone.utc).isoformat()
        return ConversationContext.model_validate(raw)

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]:
        return await self._call_tool(
            system=system,
            content=[{"type": "text", "text": user}],
            tool_name="record_result",
            tool_description="Record the final structured result.",
            schema=json_schema,
        )

    async def complete_text(self, system: str, user: str) -> str:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": user}],
        )
        return "".join(block.text for block in response.content if block.type == "text")

    async def _call_tool(
        self,
        *,
        system: str,
        content: list[dict[str, Any]],
        tool_name: str,
        tool_description: str,
        schema: dict[str, Any],
        max_tokens: int = MAX_TOKENS,
    ) -> dict[str, Any]:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": content}],
            tools=[{"name": tool_name, "description": tool_description, "input_schema": schema}],
            tool_choice={"type": "tool", "name": tool_name},
        )
        for block in response.content:
            if block.type == "tool_use" and block.name == tool_name:
                return block.input  # type: ignore[no-any-return]
        raise ValueError(f"Model did not call {tool_name!r}; response: {json.dumps(response.model_dump())}")
