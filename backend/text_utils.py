"""Shared, defensive text-shaping helpers.

Used everywhere an LLM's output must stay short regardless of whether the
model actually followed a length instruction - live testing has repeatedly
shown prompt-only length limits are not reliable across providers (this is
the third feature built on that lesson: the debate room's headline/detail
split, and now SynthesisResult's dynamic_summary/dynamic_analysis/
coaching_lesson caps, both lean on the same functions).
"""

from __future__ import annotations

import re

_HEADLINE_RE = re.compile(r"^\s*headline\s*:\s*(.+?)\s*$", re.IGNORECASE | re.MULTILINE)


def split_sentences(text: str) -> list[str]:
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


def truncate(text: str, max_chars: int) -> str:
    text = text.strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"


def cap_sentences(text: str, max_sentences: int = 3, max_chars: int = 500) -> str:
    """Keeps only the first `max_sentences` sentences, then hard-truncates as
    a final backstop against a single run-on "sentence" that never ends."""
    sentences = split_sentences(text)[:max_sentences]
    capped = " ".join(sentences) if sentences else text.strip()
    return truncate(capped, max_chars)


def split_headline_and_detail(
    raw: str, max_detail_sentences: int = 3, max_headline_chars: int = 90
) -> tuple[str, str]:
    """Parses a `HEADLINE: ...` + detail format into a short always-visible
    headline and a capped expandable detail, with a defensive fallback for
    when a model ignores the format entirely (observed live: multi-paragraph
    essays despite an explicit strict format and sentence limit)."""
    match = _HEADLINE_RE.search(raw)
    if match:
        headline = truncate(match.group(1), max_headline_chars)
        detail_source = raw[match.end() :].strip()
    else:
        sentences = split_sentences(raw)
        headline = truncate(sentences[0], max_headline_chars) if sentences else truncate(raw, max_headline_chars)
        detail_source = raw

    detail_sentences = split_sentences(detail_source)[:max_detail_sentences]
    detail = " ".join(detail_sentences) if detail_sentences else headline
    return headline, detail
