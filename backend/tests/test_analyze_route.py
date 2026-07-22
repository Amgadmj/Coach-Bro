from __future__ import annotations

import io
import os

os.environ.setdefault("LLM_MODE", "mock")

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def _image_file(name: str = "shot.png") -> tuple[str, tuple[str, io.BytesIO, str]]:
    return "images", (name, io.BytesIO(b"fake-bytes"), "image/png")


def test_analyze_rejects_zero_images() -> None:
    response = client.post("/analyze", data={}, files=[])
    assert response.status_code == 422 or response.status_code == 400


def test_analyze_accepts_one_image() -> None:
    response = client.post("/analyze", files=[_image_file()])
    assert response.status_code == 200
    assert "extraction_started" in response.text


def test_analyze_accepts_multiple_images() -> None:
    response = client.post(
        "/analyze",
        files=[_image_file("shot-1.png"), _image_file("shot-2.png"), _image_file("shot-3.png")],
    )
    assert response.status_code == 200
    assert "synthesis_done" in response.text


def test_analyze_rejects_more_than_the_configured_max(monkeypatch) -> None:
    monkeypatch.setattr(main, "MAX_IMAGES_PER_ANALYZE", 2)
    response = client.post(
        "/analyze",
        files=[_image_file("shot-1.png"), _image_file("shot-2.png"), _image_file("shot-3.png")],
    )
    assert response.status_code == 400
    assert "Too many screenshots" in response.json()["detail"]


def test_analyze_rejects_an_unsupported_image_type() -> None:
    # e.g. a HEIC photo-library pick on iOS - Anthropic's vision API can't
    # decode it, so this should fail fast and clearly, not deep in the pipeline.
    response = client.post(
        "/analyze",
        files=[("images", ("shot.heic", io.BytesIO(b"fake-bytes"), "image/heic"))],
    )
    assert response.status_code == 422
    assert "image/heic" in response.json()["detail"]


def test_analyze_rejects_a_missing_content_type() -> None:
    response = client.post(
        "/analyze",
        files=[("images", ("shot", io.BytesIO(b"fake-bytes"), "application/octet-stream"))],
    )
    assert response.status_code == 422
