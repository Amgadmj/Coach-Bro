from __future__ import annotations

from models.schemas import AlternativeResponses, SynthesisResult


def _make(**overrides: object) -> SynthesisResult:
    base = dict(
        attraction_level=6,
        dynamic_summary="fine",
        dynamic_analysis="fine",
        what_she_is_thinking=["a thought"],
        best_response="text",
        alternative_responses=AlternativeResponses(playful="p", direct="d"),
        coaching_lesson="fine",
    )
    base.update(overrides)
    return SynthesisResult.model_validate(base)


def test_dynamic_summary_is_capped_to_one_sentence_even_if_model_writes_more() -> None:
    result = _make(
        dynamic_summary="First sentence here. Second sentence that should be dropped. Third too."
    )
    assert result.dynamic_summary == "First sentence here."


def test_dynamic_analysis_capped_to_three_sentences() -> None:
    essay = " ".join(f"Sentence number {i} of a runaway analysis." for i in range(1, 10))
    result = _make(dynamic_analysis=essay)
    assert result.dynamic_analysis.count(".") <= 3  # 3 sentences, each ending in a period
    assert "number 4" not in result.dynamic_analysis


def test_coaching_lesson_capped_to_three_sentences() -> None:
    essay = " ".join(f"Lesson point {i} that goes on forever." for i in range(1, 8))
    result = _make(coaching_lesson=essay)
    assert "point 4" not in result.coaching_lesson


def test_very_long_headline_is_hard_truncated_by_char_count() -> None:
    # A single "sentence" with no punctuation at all - sentence-splitting alone
    # can't shorten it, so the character truncation backstop must kick in.
    run_on = "word " * 60
    result = _make(dynamic_summary=run_on)
    assert len(result.dynamic_summary) <= 110
    assert result.dynamic_summary.endswith("…")


def test_what_she_is_thinking_splits_tagged_values_collapsed_into_one_string() -> None:
    # Seen live: forced tool-use collapsed the array into one string that still
    # tried to represent multiple thoughts via "<value>...</value>" wrapping.
    blob = "\n<value>Is he confident or just eager?</value>\n<value>I like this</value>\n"
    result = _make(what_she_is_thinking=blob)
    assert result.what_she_is_thinking == [
        "Is he confident or just eager?",
        "I like this",
    ]


def test_what_she_is_thinking_wraps_plain_collapsed_string_as_single_item() -> None:
    result = _make(what_she_is_thinking="just one plain thought")
    assert result.what_she_is_thinking == ["just one plain thought"]
