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
from typing import Any

from anthropic import AsyncAnthropic

from models.schemas import ConversationContext

DEFAULT_VISION_MODEL = "claude-sonnet-5"
MAX_TOKENS = 2048

EXTRACTION_PROMPT = """\
Look at this chat screenshot. Extract every message in order as structured data:
- sender: "user" if the bubble is the phone owner's own outgoing message (usually right-aligned \
/ blue/dark bubble), "match" if it's the other person's incoming message (usually left-aligned \
/ grey/light bubble).
- text: the exact message text.
- timestamp: if visible, else omit.
- bubble_color: the visible bubble color/style if distinguishable, else omit.
- response_lag_seconds: estimated seconds since the prior message if a time gap is visible \
(e.g. "2 hours ago" between bubbles), else omit.

Call the record_conversation tool with the extracted data.
"""


class AnthropicClient:
    def __init__(self, api_key: str | None = None, vision_model: str | None = None) -> None:
        self._client = AsyncAnthropic(api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self._model = vision_model or os.environ.get("ANTHROPIC_VISION_MODEL", DEFAULT_VISION_MODEL)

    async def vision_extract(self, image_bytes: bytes, mime_type: str) -> ConversationContext:
        schema = ConversationContext.model_json_schema()
        # extracted_at is filled in locally, not by the model - drop it from what we ask for.
        schema["properties"].pop("extracted_at", None)
        if "required" in schema:
            schema["required"] = [f for f in schema["required"] if f != "extracted_at"]

        raw = await self._call_tool(
            system="You extract structured chat data from screenshots precisely and literally.",
            content=[
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": mime_type,
                        "data": base64.b64encode(image_bytes).decode("ascii"),
                    },
                },
                {"type": "text", "text": EXTRACTION_PROMPT},
            ],
            tool_name="record_conversation",
            tool_description="Record the structured messages extracted from the screenshot.",
            schema=schema,
        )
        from datetime import datetime, timezone

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
    ) -> dict[str, Any]:
        response = await self._client.messages.create(
            model=self._model,
            max_tokens=MAX_TOKENS,
            system=system,
            messages=[{"role": "user", "content": content}],
            tools=[{"name": tool_name, "description": tool_description, "input_schema": schema}],
            tool_choice={"type": "tool", "name": tool_name},
        )
        for block in response.content:
            if block.type == "tool_use" and block.name == tool_name:
                return block.input  # type: ignore[no-any-return]
        raise ValueError(f"Model did not call {tool_name!r}; response: {json.dumps(response.model_dump())}")
