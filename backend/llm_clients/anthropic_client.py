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
import re
from datetime import datetime, timezone
from typing import Any

from anthropic import AsyncAnthropic

from models.schemas import ConversationContext

DEFAULT_VISION_MODEL = "claude-sonnet-5"
# Seen live: synthesis has 6 free-text/array fields (dynamic_analysis,
# what_they_are_thinking, best_response, alternative_responses, coaching_lesson...)
# and the model occasionally overwrites one of the earlier ones well past its
# instructed length (the exact reason those fields already have defensive
# post-hoc truncation - see models/schemas.py) - it still burns real output
# tokens doing so, which at 2048 could truncate mid-object and drop later
# required fields entirely (ValidationError: best_response/alternative_responses
# missing). 4096 gives enough headroom that a verbose middle field doesn't
# starve the rest; the truncation validators still apply after the fact.
MAX_TOKENS = 4096
# Extraction merges however many screenshots were uploaded into one message
# list - needs more headroom than a single-call analysis/synthesis response.
EXTRACTION_MAX_TOKENS = 4096

EXTRACTION_PROMPT = """\
Look at the attached chat screenshot(s) - there may be one or several, e.g. because the user \
scrolled up to capture more of the conversation.

First, fill detected_language: the specific language (and dialect/region if identifiable, e.g. \
"Mexican Spanish", "Egyptian Arabic") the conversation is actually written in, judged from the \
message text itself, not the phone's UI chrome. If the conversation mixes languages, name the \
dominant one. Always fill this field - never skip it, even if it feels obvious. If there is no \
real conversation to read (e.g. the screenshot is empty, blank, or not a chat at all), leave it null.

Then extract every message as ONE single, chronologically ordered list:

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

Call the record_conversation tool with the extracted data.
"""


def _recover_self_nested_messages(raw: dict[str, Any]) -> dict[str, Any]:
    """Rare forced-tool-use glitch seen live: the model returns `messages` as a
    JSON string containing the ENTIRE intended object re-encoded, instead of the
    actual array - e.g. {"messages": "{\\"messages\\": [...], \\"detected_language\\": ...}"}.
    Not tied to one specific prompt wording (reproduced with two different prompt
    phrasings), so a prompt tweak can't reliably prevent it - unwrap defensively
    instead of crashing the whole read, same rationale as the what_they_are_thinking
    single-string coercion in models/schemas.py."""
    messages_value = raw.get("messages")
    if isinstance(messages_value, str):
        try:
            unwrapped = json.loads(messages_value)
        except (json.JSONDecodeError, TypeError):
            return raw
        if isinstance(unwrapped, dict) and isinstance(unwrapped.get("messages"), list):
            return unwrapped
    return raw


# Stops each tag's content at the next tag (closing OR another opening
# <parameter>) or end of string - needed because the model sometimes leaks a
# whole run of tags with no closing </parameter> between them at all, and a
# terminator of "</parameter> or end-of-string" alone would let the first
# tag's lazy match swallow every tag after it.
_PARAM_TAG_RE = re.compile(
    r'<parameter name="(\w+)">(.*?)(?=</parameter>|<parameter name="|\Z)', re.DOTALL
)
_INVOKE_WRAPPER_RE = re.compile(r"</?(?:invoke|function_calls)[^>]*>", re.DOTALL)


def _recover_leaked_parameter_tags(raw: dict[str, Any], valid_fields: set[str]) -> dict[str, Any]:
    """Rare forced-tool-use glitch seen live: instead of setting top-level keys
    directly, the model bleeds its OWN tool-call syntax - literal
    `<invoke...><parameter name="best_response">...</parameter>...</invoke>`
    fragments, the XML-style tool-call format Claude uses in other contexts -
    into a different field's string VALUE, sometimes several fields' worth in
    one run. The intended fields then go missing entirely (required-field
    ValidationErrors several frames from the real cause), and the field that
    held them ends up polluted with the stray markup. Recover every trapped
    value into its real field and strip the leaked markup out of the field
    that held it."""
    patched = dict(raw)
    for key, value in raw.items():
        if not isinstance(value, str):
            continue
        matches = list(_PARAM_TAG_RE.finditer(value))
        if not matches:
            continue
        for match in matches:
            field_name = match.group(1)
            # The LAST tag in a run with no closing </parameter> anywhere
            # captures through to end-of-string, which can include a trailing
            # </invoke> wrapper - strip that out of the extracted value too.
            content = _INVOKE_WRAPPER_RE.sub("", match.group(2)).strip()
            if field_name in valid_fields and field_name not in raw:
                # A structured field (e.g. alternative_responses, an object)
                # leaks as JSON text too - decode it back rather than handing
                # Pydantic a string where it expects a dict/list. Plain prose
                # fields (best_response, coaching_lesson) simply aren't valid
                # JSON, so this falls back to the raw string for those.
                try:
                    patched[field_name] = json.loads(content)
                except (json.JSONDecodeError, TypeError):
                    patched[field_name] = content
        cleaned = _PARAM_TAG_RE.sub("", value)
        cleaned = _INVOKE_WRAPPER_RE.sub("", cleaned)
        patched[key] = cleaned.strip()
    return patched


class AnthropicClient:
    def __init__(self, api_key: str | None = None, vision_model: str | None = None) -> None:
        self._client = AsyncAnthropic(api_key=api_key or os.environ["ANTHROPIC_API_KEY"])
        self._model = vision_model or os.environ.get("ANTHROPIC_VISION_MODEL", DEFAULT_VISION_MODEL)

    async def vision_extract(self, images: list[tuple[bytes, str]]) -> ConversationContext:
        """`images` is one or more (image_bytes, mime_type) pairs - all screenshots
        from a single /analyze call, sent to Claude in one message so it can merge
        and de-duplicate across them (see EXTRACTION_PROMPT)."""
        schema = ConversationContext.model_json_schema()
        # extracted_at is filled in locally, not by the model - drop it from what we ask
        # for. scenario_notes is only ever attached by orchestrator code afterward (see
        # swarm_orchestrator.py::_extract_context) - never by the extraction model itself.
        for field in ("extracted_at", "scenario_notes"):
            schema["properties"].pop(field, None)
        if "required" in schema:
            schema["required"] = [f for f in schema["required"] if f not in ("extracted_at", "scenario_notes")]

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
        raw = _recover_self_nested_messages(raw)
        raw["extracted_at"] = datetime.now(timezone.utc).isoformat()
        return ConversationContext.model_validate(raw)

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]:
        raw = await self._call_tool(
            system=system,
            content=[{"type": "text", "text": user}],
            tool_name="record_result",
            tool_description="Record the final structured result.",
            schema=json_schema,
        )
        return _recover_leaked_parameter_tags(raw, set(json_schema.get("properties", {})))

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
                if response.stop_reason == "max_tokens":
                    # The tool call itself parsed, but got cut off mid-object -
                    # trailing required fields are likely missing. Surface that
                    # plainly rather than letting it fall through as a cryptic
                    # Pydantic ValidationError several frames away from the cause.
                    raise ValueError(
                        f"{tool_name!r} call hit max_tokens ({max_tokens}) and was truncated - "
                        "raise max_tokens or shorten the prompt/output."
                    )
                return block.input  # type: ignore[no-any-return]
        raise ValueError(f"Model did not call {tool_name!r}; response: {json.dumps(response.model_dump())}")
