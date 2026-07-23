from __future__ import annotations

import io
import os

os.environ.setdefault("LLM_MODE", "mock")

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import main

client = TestClient(main.app)


def _image_file(name: str = "shot.png") -> tuple[str, tuple[str, io.BytesIO, str]]:
    return "images", (name, io.BytesIO(b"fake-bytes"), "image/png")


def test_extract_rejects_zero_images() -> None:
    response = client.post("/extract", files=[])
    assert response.status_code == 422 or response.status_code == 400


def test_extract_returns_context_and_markdown() -> None:
    response = client.post("/extract", files=[_image_file()])
    assert response.status_code == 200
    body = response.json()
    assert "context" in body and "markdown" in body
    assert body["context"]["messages"], "MockLLMClient's fixture should have messages"
    assert "Match" in body["markdown"] or "You" in body["markdown"]


def test_extract_accepts_multiple_images() -> None:
    response = client.post(
        "/extract",
        files=[_image_file("shot-1.png"), _image_file("shot-2.png")],
    )
    assert response.status_code == 200


def test_extract_rejects_more_than_the_configured_max(monkeypatch) -> None:
    monkeypatch.setattr(main, "MAX_IMAGES_PER_ANALYZE", 2)
    response = client.post(
        "/extract",
        files=[_image_file("shot-1.png"), _image_file("shot-2.png"), _image_file("shot-3.png")],
    )
    assert response.status_code == 400
    assert "Too many screenshots" in response.json()["detail"]


def test_extract_rejects_an_unsupported_image_type() -> None:
    response = client.post(
        "/extract",
        files=[("images", ("shot.bmp", io.BytesIO(b"fake-bytes"), "image/bmp"))],
    )
    assert response.status_code == 422
    assert "image/bmp" in response.json()["detail"]


def test_extract_accepts_and_converts_a_heic_image() -> None:
    buffer = io.BytesIO()
    try:
        Image.new("RGB", (32, 32), (200, 100, 50)).save(buffer, format="HEIF")
    except Exception:
        pytest.skip("pillow_heif HEIF encoder unavailable in this environment")
    heic_bytes = buffer.getvalue()
    assert heic_bytes, "pillow_heif produced no bytes"

    response = client.post(
        "/extract",
        files=[("images", ("shot.heic", io.BytesIO(heic_bytes), "image/heic"))],
    )
    assert response.status_code == 200


def test_extract_has_its_own_rate_limit_separate_from_analyze() -> None:
    # Exhausting /extract's budget must not touch /analyze's - they're fired at
    # very different rates (per screenshot attach vs. per deliberate Send).
    # `monkeypatch.setattr(main, "extract_limiter", ...)` would NOT work here:
    # `Depends(extract_limiter)` captured the original RateLimiter instance by
    # reference at route-registration time (import time), so reassigning the
    # module attribute afterward doesn't change what the route actually calls.
    # `app.dependency_overrides` is FastAPI's supported per-test override hook
    # for exactly this - keyed by the original dependency callable.
    fresh_extract = main.RateLimiter(max_requests=1, window_seconds=3600)
    fresh_analyze = main.RateLimiter(max_requests=1, window_seconds=3600)
    main.app.dependency_overrides[main.extract_limiter] = fresh_extract
    main.app.dependency_overrides[main.analyze_limiter] = fresh_analyze
    try:
        first = client.post("/extract", files=[_image_file()])
        assert first.status_code == 200
        second = client.post("/extract", files=[_image_file()])
        assert second.status_code == 429

        still_fine = client.post("/analyze", files=[_image_file()])
        assert still_fine.status_code == 200
    finally:
        main.app.dependency_overrides.clear()
