from __future__ import annotations

from datetime import datetime, timezone

from markdown_format import conversation_to_markdown
from models.schemas import ConversationContext, Message


def test_empty_conversation_yields_empty_markdown() -> None:
    context = ConversationContext(messages=[], extracted_at=datetime.now(timezone.utc), detected_language=None)
    assert conversation_to_markdown(context) == ""


def test_detected_language_header() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="hey")],
        extracted_at=datetime.now(timezone.utc),
        detected_language="Egyptian Arabic",
    )
    md = conversation_to_markdown(context)
    assert md.startswith("**Detected language:** Egyptian Arabic")


def test_no_detected_language_omits_header() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="hey")],
        extracted_at=datetime.now(timezone.utc),
        detected_language=None,
    )
    md = conversation_to_markdown(context)
    assert "Detected language" not in md


def test_timestamp_takes_priority_over_lag() -> None:
    context = ConversationContext(
        messages=[Message(sender="user", text="hi", timestamp="9:41 PM", response_lag_seconds=42.0)],
        extracted_at=datetime.now(timezone.utc),
    )
    md = conversation_to_markdown(context)
    assert "9:41 PM" in md
    assert "42s later" not in md


def test_lag_formats_coarsely_by_magnitude() -> None:
    cases = [(30.0, "30s later"), (90.0, "1m later"), (7200.0, "2h later"), (90000.0, "1d later")]
    for lag, expected in cases:
        context = ConversationContext(
            messages=[Message(sender="match", text="hey", response_lag_seconds=lag)],
            extracted_at=datetime.now(timezone.utc),
        )
        assert expected in conversation_to_markdown(context)


def test_reactions_render_on_meta_line() -> None:
    context = ConversationContext(
        messages=[Message(sender="user", text="hi", response_lag_seconds=5.0, reactions=["❤️", "😂"])],
        extracted_at=datetime.now(timezone.utc),
    )
    md = conversation_to_markdown(context)
    assert "❤️ 😂 reacted" in md


def test_voice_note_renders_duration_placeholder_not_empty_text() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="", message_type="voice_note", duration_seconds=14.0)],
        extracted_at=datetime.now(timezone.utc),
    )
    md = conversation_to_markdown(context)
    assert "🎤 voice note (0:14)" in md


def test_non_text_message_with_caption_appends_it() -> None:
    context = ConversationContext(
        messages=[Message(sender="match", text="check this out", message_type="image")],
        extracted_at=datetime.now(timezone.utc),
    )
    md = conversation_to_markdown(context)
    assert "🖼️ image — check this out" in md


def test_sender_labels() -> None:
    context = ConversationContext(
        messages=[Message(sender="user", text="hi"), Message(sender="match", text="hey")],
        extracted_at=datetime.now(timezone.utc),
    )
    md = conversation_to_markdown(context)
    assert "**You**" in md
    assert "**Match**" in md
