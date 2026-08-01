"""users.has_seen_onboarding + POST /auth/me/onboarding-seen (Release TASK 6)."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_me_defaults_to_not_seen(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org())
    res = client.get("/api/v1/auth/me", headers=auth_headers(user))
    assert res.status_code == 200
    assert res.json()["has_seen_onboarding"] is False


def test_set_and_reset_onboarding_seen(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org())
    headers = auth_headers(user)

    seen = client.post("/api/v1/auth/me/onboarding-seen", headers=headers, json={"seen": True})
    assert seen.status_code == 200
    assert seen.json()["has_seen_onboarding"] is True

    reset = client.post("/api/v1/auth/me/onboarding-seen", headers=headers, json={"seen": False})
    assert reset.json()["has_seen_onboarding"] is False


def test_onboarding_seen_requires_auth(client: TestClient) -> None:
    assert client.post("/api/v1/auth/me/onboarding-seen", json={"seen": True}).status_code in (401, 403)
