from __future__ import annotations

import os
import uuid

os.environ.setdefault("LLM_MODE", "mock")

from fastapi.testclient import TestClient

import main

# Unique per test-suite run - see test_device_scoping.py's comment on why a
# fixed device id would accumulate stale data across repeated local runs
# against a real, persistent Postgres store.
_DEVICE_A = f"profile-test-device-a-{uuid.uuid4()}"
_DEVICE_B = f"profile-test-device-b-{uuid.uuid4()}"

client_a = TestClient(main.app, headers={"X-Device-Id": _DEVICE_A})
client_b = TestClient(main.app, headers={"X-Device-Id": _DEVICE_B})


def test_get_profile_before_ever_setting_it_returns_nulls() -> None:
    response = client_a.get("/profile")
    assert response.status_code == 200
    assert response.json() == {"display_name": None, "phone_number": None}


def test_set_and_get_profile_round_trips() -> None:
    response = client_a.patch("/profile", json={"display_name": "Priya", "phone_number": "555-0100"})
    assert response.status_code == 200

    profile = client_a.get("/profile").json()
    assert profile == {"display_name": "Priya", "phone_number": "555-0100"}


def test_profile_response_never_includes_an_ip_field() -> None:
    client_a.patch("/profile", json={"display_name": "Priya", "phone_number": "555-0100"})
    profile = client_a.get("/profile").json()
    assert "last_ip" not in profile
    assert "ip" not in profile


def test_profile_is_device_scoped() -> None:
    client_a.patch("/profile", json={"display_name": "Device A Name", "phone_number": "111"})
    client_b.patch("/profile", json={"display_name": "Device B Name", "phone_number": "222"})

    assert client_a.get("/profile").json()["display_name"] == "Device A Name"
    assert client_b.get("/profile").json()["display_name"] == "Device B Name"


def test_profile_update_overwrites_previous_values() -> None:
    client_a.patch("/profile", json={"display_name": "First Name", "phone_number": "111"})
    client_a.patch("/profile", json={"display_name": "Updated Name", "phone_number": "222"})

    profile = client_a.get("/profile").json()
    assert profile == {"display_name": "Updated Name", "phone_number": "222"}


def test_profile_endpoints_require_device_id() -> None:
    no_header_client = TestClient(main.app)
    assert no_header_client.get("/profile").status_code == 400
    assert no_header_client.patch("/profile", json={"display_name": "x"}).status_code == 400
