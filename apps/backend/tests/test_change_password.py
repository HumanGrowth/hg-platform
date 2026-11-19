"""POST /api/v1/auth/me/change-password — cambio autenticado (NT-02)."""
from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

URL = "/api/v1/auth/me/change-password"
OLD = "OldPassw0rd!!"
NEW = "NewPassw0rd!!"


def _login(client: TestClient, email: str, password: str):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})


def test_change_password_success(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org(licenses_total=10), password=OLD)
    res = client.post(
        URL, headers=auth_headers(user), json={"current_password": OLD, "new_password": NEW}
    )
    assert res.status_code == 204, res.text
    assert _login(client, user.email, NEW).status_code == 200
    assert _login(client, user.email, OLD).status_code == 401


def test_wrong_current_password(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org(licenses_total=10), password=OLD)
    res = client.post(
        URL, headers=auth_headers(user), json={"current_password": "nope-nope", "new_password": NEW}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "invalid credentials"
    assert _login(client, user.email, OLD).status_code == 200  # no cambió


def test_new_equals_current_rejected(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org(licenses_total=10), password=OLD)
    res = client.post(
        URL, headers=auth_headers(user), json={"current_password": OLD, "new_password": OLD}
    )
    assert res.status_code == 400


def test_new_password_min_length(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org(licenses_total=10), password=OLD)
    res = client.post(
        URL, headers=auth_headers(user), json={"current_password": OLD, "new_password": "12345"}
    )
    assert res.status_code == 422


def test_requires_authentication(client: TestClient) -> None:
    res = client.post(URL, json={"current_password": OLD, "new_password": NEW})
    assert res.status_code == 401


def test_revokes_existing_refresh_tokens(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org(licenses_total=10), password=OLD)
    refresh = _login(client, user.email, OLD).json()["refresh_token"]
    res = client.post(
        URL, headers=auth_headers(user), json={"current_password": OLD, "new_password": NEW}
    )
    assert res.status_code == 204, res.text
    assert client.post("/api/v1/auth/refresh", json={"refresh_token": refresh}).status_code == 401


def test_rate_limited(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org(licenses_total=10), password=OLD)
    with patch("hg.modules.identity.service.rate_limit.allow", return_value=False):
        res = client.post(
            URL, headers=auth_headers(user), json={"current_password": OLD, "new_password": NEW}
        )
    assert res.status_code == 429
    assert _login(client, user.email, OLD).status_code == 200
