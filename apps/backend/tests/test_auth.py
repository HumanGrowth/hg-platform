"""Auth endpoint tests (DEV-06): login, refresh, logout, me."""
from __future__ import annotations

import jwt
from fastapi.testclient import TestClient

from hg.config import get_settings
from hg.modules.identity.models import UserRole

settings = get_settings()


def _decode(token: str) -> dict:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])


def test_login_ok_and_jwt_claims(client: TestClient, factory) -> None:
    org = factory.make_org()
    factory.make_user(org=org, email="alice@hgtest.test", password="Sup3rPass!!", role=UserRole.admin)

    res = client.post(
        "/api/v1/auth/login",
        json={"email": "alice@hgtest.test", "password": "Sup3rPass!!", "org_slug": org.slug},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert set(body) >= {"access_token", "refresh_token", "user"}
    assert body["user"]["email"] == "alice@hgtest.test"

    claims = _decode(body["access_token"])
    assert claims["type"] == "access"
    assert claims["role"] == "admin"
    assert claims["org_id"] == str(org.id)
    assert claims["sub"] == body["user"]["id"]


def test_login_wrong_password_401(client: TestClient, factory) -> None:
    org = factory.make_org()
    factory.make_user(org=org, email="bob@hgtest.test", password="Correct!!11")
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "bob@hgtest.test", "password": "WRONGwrong11", "org_slug": org.slug},
    )
    assert res.status_code == 401
    assert res.json()["detail"] == "invalid credentials"


def test_login_unknown_email_401_same_message(client: TestClient, factory) -> None:
    factory.make_org()  # asegura que hay alguna org, pero el email no existe
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@hgtest.test", "password": "whatever1234"},
    )
    assert res.status_code == 401
    # Mismo mensaje genérico que password incorrecto (no filtra existencia).
    assert res.json()["detail"] == "invalid credentials"


def test_refresh_rotates_session(client: TestClient, factory) -> None:
    org = factory.make_org()
    factory.make_user(org=org, email="carol@hgtest.test", password="Rotate!!123")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "carol@hgtest.test", "password": "Rotate!!123", "org_slug": org.slug},
    ).json()
    old_refresh = login["refresh_token"]

    res = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert res.status_code == 200, res.text
    new_refresh = res.json()["refresh_token"]
    assert new_refresh != old_refresh

    # El refresh viejo ya fue rotado (revocado) -> 401.
    again = client.post("/api/v1/auth/refresh", json={"refresh_token": old_refresh})
    assert again.status_code == 401


def test_refresh_with_access_token_401(client: TestClient, factory) -> None:
    org = factory.make_org()
    factory.make_user(org=org, email="dave@hgtest.test", password="Access!!123")
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "dave@hgtest.test", "password": "Access!!123", "org_slug": org.slug},
    ).json()
    # Mandar el ACCESS token al endpoint de refresh debe fallar (type mismatch).
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": login["access_token"]})
    assert res.status_code == 401


def test_me_returns_current_user(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org, email="erin@hgtest.test", role=UserRole.manager)
    res = client.get("/api/v1/auth/me", headers=auth_headers(user))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["email"] == "erin@hgtest.test"
    assert body["role"] == "manager"
    assert body["org_id"] == str(org.id)


def test_me_without_token_401(client: TestClient) -> None:
    res = client.get("/api/v1/auth/me")
    assert res.status_code in (401, 403)  # HTTPBearer sin credenciales
