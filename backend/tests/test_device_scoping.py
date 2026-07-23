from __future__ import annotations

import io
import os

os.environ.setdefault("LLM_MODE", "mock")

from fastapi.testclient import TestClient

import main

client_a = TestClient(main.app, headers={"X-Device-Id": "device-a"})
client_b = TestClient(main.app, headers={"X-Device-Id": "device-b"})
client_no_header = TestClient(main.app)


def _image_file(name: str = "shot.png") -> tuple[str, tuple[str, io.BytesIO, str]]:
    return "images", (name, io.BytesIO(b"fake-bytes"), "image/png")


def test_missing_device_id_header_is_rejected() -> None:
    for path, kwargs in [
        ("/analyze", {"files": [_image_file()]}),
        ("/suggest", {"json": {"scenario": "at a coffee shop"}}),
        ("/contacts", {}),
        ("/contacts/sarah/history", {}),
    ]:
        response = (
            client_no_header.get(path, **kwargs)
            if path.startswith("/contacts")
            else client_no_header.post(path, **kwargs)
        )
        assert response.status_code == 400, f"{path} did not reject a missing X-Device-Id header"


def test_two_devices_with_same_contact_name_do_not_collide() -> None:
    """The confirmed bug: two different people naming a contact the same thing
    used to share one global row and see each other's reads. Each device's
    "sarah" must be its own, isolated contact."""
    response_a = client_a.post("/analyze", files=[_image_file()], data={"contact_id": "sarah"})
    assert response_a.status_code == 200
    response_b = client_b.post("/analyze", files=[_image_file()], data={"contact_id": "sarah"})
    assert response_b.status_code == 200

    contacts_a = client_a.get("/contacts").json()
    contacts_b = client_b.get("/contacts").json()

    assert [c["id"] for c in contacts_a] == ["sarah"]
    assert [c["id"] for c in contacts_b] == ["sarah"]
    # Both ran exactly one read against their own "sarah" - if they were
    # sharing a row, one of these would show session_count == 2.
    assert contacts_a[0]["session_count"] == 1
    assert contacts_b[0]["session_count"] == 1


def test_contacts_list_does_not_leak_across_devices() -> None:
    client_a.post("/analyze", files=[_image_file()], data={"contact_id": "only-a-knows-this"})

    contacts_b = client_b.get("/contacts").json()
    assert "only-a-knows-this" not in [c["id"] for c in contacts_b]


def test_contact_history_does_not_leak_across_devices() -> None:
    client_a.post("/analyze", files=[_image_file()], data={"contact_id": "history-test"})

    history_from_owner = client_a.get("/contacts/history-test/history").json()
    history_from_other_device = client_b.get("/contacts/history-test/history").json()

    assert len(history_from_owner) >= 1
    assert history_from_other_device == []
