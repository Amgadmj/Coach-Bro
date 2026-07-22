from __future__ import annotations

import json

from llm_clients.anthropic_client import (
    _recover_leaked_parameter_tags,
    _recover_self_nested_messages,
)
from models.schemas import SynthesisResult


def test_recovers_a_self_nested_messages_string() -> None:
    # Seen live: the model wrapped the whole intended object as a JSON string
    # and put it in the "messages" field instead of returning the array directly.
    inner = {
        "detected_language": "Brazilian Portuguese",
        "messages": [{"sender": "user", "text": "Oi"}],
    }
    raw = {"messages": json.dumps(inner)}
    recovered = _recover_self_nested_messages(raw)
    assert recovered == inner


def test_leaves_a_normal_list_untouched() -> None:
    raw = {"messages": [{"sender": "user", "text": "hey"}], "detected_language": "English"}
    assert _recover_self_nested_messages(raw) == raw


def test_leaves_an_unparseable_string_untouched_rather_than_crashing() -> None:
    raw = {"messages": "not valid json at all"}
    assert _recover_self_nested_messages(raw) == raw


def test_leaves_a_string_that_parses_but_isnt_the_expected_shape_untouched() -> None:
    # Parses as JSON but doesn't look like the self-nested case - don't guess.
    raw = {"messages": json.dumps({"unrelated": "value"})}
    assert _recover_self_nested_messages(raw) == raw


def test_recovers_a_leaked_parameter_tag_into_its_real_field() -> None:
    # Seen live: best_response went missing entirely because its content got
    # trapped inside what_she_is_thinking as a leaked tool-call-style tag.
    raw = {
        "attraction_level": 7,
        "what_she_is_thinking": '\n<parameter name="best_response">kkkkk agora sim, voz e tudo',
        "alternative_responses": {"playful": "p", "direct": "d"},
        "coaching_lesson": "fine",
    }
    valid_fields = {
        "attraction_level",
        "dynamic_summary",
        "dynamic_analysis",
        "what_she_is_thinking",
        "best_response",
        "alternative_responses",
        "coaching_lesson",
    }
    recovered = _recover_leaked_parameter_tags(raw, valid_fields)
    assert recovered["best_response"] == "kkkkk agora sim, voz e tudo"
    assert "<parameter" not in recovered["what_she_is_thinking"]


def test_does_not_overwrite_a_field_that_is_already_correctly_set() -> None:
    raw = {
        "best_response": "the real one",
        "what_she_is_thinking": '<parameter name="best_response">a decoy',
    }
    recovered = _recover_leaked_parameter_tags(raw, {"best_response", "what_she_is_thinking"})
    assert recovered["best_response"] == "the real one"


def test_leaves_strings_with_no_leaked_tag_untouched() -> None:
    raw = {"best_response": "normal text", "coaching_lesson": "also normal"}
    assert _recover_leaked_parameter_tags(raw, set(raw.keys())) == raw


def test_recovers_a_whole_leaked_invoke_block_with_multiple_unclosed_tags() -> None:
    # Seen live, worse case: a run of several <parameter> tags with no closing
    # </parameter> between them at all, wrapped in <invoke>...</invoke>.
    leaked = (
        '<invoke name="record_result">\n'
        '<parameter name="best_response">kkkkk agora sim, voz e tudo\n'
        '<parameter name="alternative_responses">{"playful": "p", "direct": "d"}\n'
        '<parameter name="coaching_lesson">\n'
        "</invoke>\n"
    )
    raw = {
        "attraction_level": 7,
        "dynamic_summary": "fine",
        "dynamic_analysis": leaked,
        "what_she_is_thinking": ["a thought"],
    }
    valid_fields = {
        "attraction_level",
        "dynamic_summary",
        "dynamic_analysis",
        "what_she_is_thinking",
        "best_response",
        "alternative_responses",
        "coaching_lesson",
    }
    recovered = _recover_leaked_parameter_tags(raw, valid_fields)
    assert recovered["best_response"] == "kkkkk agora sim, voz e tudo"
    # A structured field's leaked content is real JSON text - decode it back
    # to a dict rather than leaving it as a string SynthesisResult can't use.
    assert recovered["alternative_responses"] == {"playful": "p", "direct": "d"}
    assert recovered["coaching_lesson"] == ""
    assert "<parameter" not in recovered["dynamic_analysis"]
    assert "<invoke" not in recovered["dynamic_analysis"]
    assert "</invoke>" not in recovered["dynamic_analysis"]

    # And the fully recovered dict now actually validates against the real
    # schema (minus coaching_lesson, which genuinely had no content to recover).
    recovered["coaching_lesson"] = "fallback lesson"
    SynthesisResult.model_validate(recovered)
