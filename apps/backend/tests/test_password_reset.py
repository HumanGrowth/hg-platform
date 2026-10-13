"""Recuperación de contraseña: forgot-password → reset-password."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy import text

from hg.db import SessionLocal


def _request_link(client: TestClient, email: str) -> str | None:
    """Pide el reset y captura el token del email (el envío real está apagado)."""
    sent: list[dict] = []
    with patch(
        "hg.modules.identity.service.email_service.send",
        side_effect=lambda **kw: sent.append(kw) or "sent",
    ):
        res = client.post("/api/v1/auth/forgot-password", json={"email": email})
    assert res.status_code == 202, res.text
    if not sent:
        return None
    assert sent[0]["template"] == "password_reset"
    return sent[0]["context"]["link"].split("token=")[1]


def test_full_flow(client: TestClient, factory) -> None:
    org = factory.make_org(licenses_total=10)
    user = factory.make_user(org=org, password="OldPassw0rd!!")
    token = _request_link(client, user.email)
    assert token

    assert client.get("/api/v1/auth/reset-password/validate", params={"token": token}).status_code == 204

    res = client.post("/api/v1/auth/reset-password", json={"token": token, "password": "NewPassw0rd!!"})
    assert res.status_code == 204, res.text

    old = client.post("/api/v1/auth/login", json={"email": user.email, "password": "OldPassw0rd!!"})
    assert old.status_code == 401
    new = client.post("/api/v1/auth/login", json={"email": user.email, "password": "NewPassw0rd!!"})
    assert new.status_code == 200

    # un solo uso
    again = client.post("/api/v1/auth/reset-password", json={"token": token, "password": "Another0ne!!"})
    assert again.status_code == 410


def test_unknown_email_same_response_no_email(client: TestClient) -> None:
    assert _request_link(client, "nobody@hgtest.test") is None


def test_reset_revokes_existing_sessions(client: TestClient, factory) -> None:
    org = factory.make_org(licenses_total=10)
    user = factory.make_user(org=org, password="OldPassw0rd!!")
    login = client.post("/api/v1/auth/login", json={"email": user.email, "password": "OldPassw0rd!!"})
    refresh = login.json()["refresh_token"]

    token = _request_link(client, user.email)
    assert client.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "NewPassw0rd!!"}
    ).status_code == 204

    assert client.post("/api/v1/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_expired_token_rejected(client: TestClient, factory) -> None:
    org = factory.make_org(licenses_total=10)
    user = factory.make_user(org=org)
    token = _request_link(client, user.email)
    db = SessionLocal()
    try:
        db.execute(text("SET ROLE hg_superadmin"))
        db.execute(
            text("UPDATE password_reset_tokens SET expires_at = :ts WHERE user_id = :u"),
            {"ts": datetime.now(UTC) - timedelta(minutes=1), "u": user.id},
        )
        db.commit()
    finally:
        db.close()
    assert client.get("/api/v1/auth/reset-password/validate", params={"token": token}).status_code == 410
    assert client.post(
        "/api/v1/auth/reset-password", json={"token": token, "password": "NewPassw0rd!!"}
    ).status_code == 410


def test_cooldown_and_inactive_user(client: TestClient, factory) -> None:
    org = factory.make_org(licenses_total=10)
    user = factory.make_user(org=org)
    assert _request_link(client, user.email)
    assert _request_link(client, user.email) is None  # cooldown de 60s

    inactive = factory.make_user(org=org, is_active=False)
    assert _request_link(client, inactive.email) is None


def test_short_password_422(client: TestClient) -> None:
    res = client.post("/api/v1/auth/reset-password", json={"token": "x", "password": "123"})
    assert res.status_code == 422
