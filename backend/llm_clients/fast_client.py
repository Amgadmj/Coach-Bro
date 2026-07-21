"""Fast/cheap LLMClient for the parallel debate agents (Arthur/Clara/Leo).

Only `complete_text` is implemented - the debate agents never need vision
or strict JSON. Provider is chosen at construction time so swapping Groq
<-> Gemini never touches swarm_orchestrator.py.
"""

from __future__ import annotations

import os
from typing import Any, Literal

from models.schemas import ConversationContext

DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile"
DEFAULT_GEMINI_MODEL = "gemini-2.0-flash"
MAX_TOKENS = 1024

FastProvider = Literal["groq", "gemini"]


class FastLLMClient:
    def __init__(self, provider: FastProvider | None = None, model: str | None = None) -> None:
        self._provider: FastProvider = provider or os.environ.get("FAST_LLM_PROVIDER", "groq")  # type: ignore[assignment]
        self._model = model
        if self._provider not in ("groq", "gemini"):
            raise ValueError(f"Unsupported fast LLM provider: {self._provider!r}")

    async def vision_extract(self, image_bytes: bytes, mime_type: str) -> ConversationContext:
        raise NotImplementedError("FastLLMClient is for debate agents only; use AnthropicClient for vision.")

    async def complete_json(self, system: str, user: str, json_schema: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError("FastLLMClient is for debate agents only; use AnthropicClient for synthesis.")

    async def complete_text(self, system: str, user: str) -> str:
        if self._provider == "groq":
            return await self._complete_text_groq(system, user)
        return await self._complete_text_gemini(system, user)

    async def _complete_text_groq(self, system: str, user: str) -> str:
        from groq import AsyncGroq

        client = AsyncGroq(api_key=os.environ["GROQ_API_KEY"])
        response = await client.chat.completions.create(
            model=self._model or DEFAULT_GROQ_MODEL,
            max_tokens=MAX_TOKENS,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response.choices[0].message.content or ""

    async def _complete_text_gemini(self, system: str, user: str) -> str:
        from google import genai

        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        response = await client.aio.models.generate_content(
            model=self._model or DEFAULT_GEMINI_MODEL,
            contents=user,
            config={"system_instruction": system, "max_output_tokens": MAX_TOKENS},
        )
        return response.text or ""
