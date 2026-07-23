from __future__ import annotations

import io
import os
import uuid

os.environ.setdefault("LLM_MODE", "mock")

from fastapi.testclient import TestClient

import main

# Unique per test-suite run - see test_device_scoping.py's comment on why a
# fixed device id would accumulate stale contacts across repeated local runs
# against a real, persistent Postgres store.
_DEVICE_A = f"gender-test-device-a-{uuid.uuid4()}"
_DEVICE_B = f"gender-test-device-b-{uuid.uuid4()}"

client_a = TestClient(main.app, headers={"X-Device-Id": _DEVICE_A})
client_b = TestClient(main.app, headers={"X-Device-Id": _DEVICE_B})


def _image_file(name: str = "shot.png") -> tuple[str, tuple[str, io.BytesIO, str]]:
    return "images", (name, io.BytesIO(b"fake-bytes"), "image/png")


def test_set_match_gender_creates_contact_if_needed_and_is_returned_by_list_contacts() -> None:
    """The "+ New" contact flow (web/src/app/live/page.tsx) calls this right
    after naming a contact, before any read has happened yet - must not
    require the contact to already exist."""
    response = client_a.patch("/contacts/priya", json={"match_gender": "female"})
    assert response.status_code == 200

    contacts = client_a.get("/contacts").json()
    priya = next(c for c in contacts if c["id"] == "priya")
    assert priya["match_gender"] == "female"


def test_match_gender_can_be_set_before_or_after_a_read() -> None:
    client_a.post("/analyze", files=[_image_file()], data={"contact_id": "sam"})
    client_a.patch("/contacts/sam", json={"match_gender": "non_binary"})

    contacts = client_a.get("/contacts").json()
    sam = next(c for c in contacts if c["id"] == "sam")
    assert sam["match_gender"] == "non_binary"
    assert sam["session_count"] == 1


def test_match_gender_defaults_to_null_when_never_set() -> None:
    client_a.post("/analyze", files=[_image_file()], data={"contact_id": "no-gender-set"})

    contacts = client_a.get("/contacts").json()
    contact = next(c for c in contacts if c["id"] == "no-gender-set")
    assert contact["match_gender"] is None


def test_match_gender_is_device_scoped() -> None:
    """Same contact name, different devices - device A setting a gender on
    "jordan" must not affect device B's own, separate "jordan"."""
    client_a.patch("/contacts/jordan", json={"match_gender": "male"})
    client_b.patch("/contacts/jordan", json={"match_gender": "female"})

    jordan_a = next(c for c in client_a.get("/contacts").json() if c["id"] == "jordan")
    jordan_b = next(c for c in client_b.get("/contacts").json() if c["id"] == "jordan")

    assert jordan_a["match_gender"] == "male"
    assert jordan_b["match_gender"] == "female"


def test_set_match_gender_requires_device_id() -> None:
    no_header_client = TestClient(main.app)
    response = no_header_client.patch("/contacts/anyone", json={"match_gender": "male"})
    assert response.status_code == 400
