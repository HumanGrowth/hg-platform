"""accept-invite con username_or_email (Release TASK 3.4)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole


def _invite(client, factory, auth_headers, org, email: str) -> str:
    admin = factory.make_user(org=org, role=UserRole.admin)
    inv = client.post(
        f"/api/v1/admin/orgs/{org.id}/invite",
        headers=auth_headers(admin),
        json={"email": email, "role": "collaborator"},
    )
    assert inv.status_code == 201, inv.text
    return inv.json()["invite_token"]


def test_accept_with_username(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    token = _invite(client, factory, auth_headers, org, "u1@hgtest.test")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Brand0New!!", "username_or_email": "cool_user"},
    )
    assert res.status_code == 200, res.text
    user = res.json()["user"]
    assert user["username"] == "cool_user"
    assert user["full_name"] == "cool_user"
    assert user["email"] == "u1@hgtest.test"  # sigue siendo el email invitado


def test_accept_with_matching_email(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    token = _invite(client, factory, auth_headers, org, "maria.perez@hgtest.test")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Brand0New!!", "username_or_email": "maria.perez@hgtest.test"},
    )
    assert res.status_code == 200, res.text
    user = res.json()["user"]
    assert user["username"] is None
    assert user["full_name"] == "Maria"  # derivado del local-part


def test_accept_with_non_matching_email_400(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    token = _invite(client, factory, auth_headers, org, "invited@hgtest.test")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Brand0New!!", "username_or_email": "someone.else@x.test"},
    )
    assert res.status_code == 400


def test_duplicate_username_in_org_409(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    t1 = _invite(client, factory, auth_headers, org, "a@hgtest.test")
    t2 = _invite(client, factory, auth_headers, org, "b@hgtest.test")
    first = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": t1, "password": "Brand0New!!", "username_or_email": "samename"},
    )
    assert first.status_code == 200, first.text
    second = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": t2, "password": "Brand0New!!", "username_or_email": "samename"},
    )
    assert second.status_code == 409


def test_backward_compat_full_name(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    token = _invite(client, factory, auth_headers, org, "legacy@hgtest.test")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Brand0New!!", "full_name": "Legacy Name"},
    )
    assert res.status_code == 200, res.text
    assert res.json()["user"]["full_name"] == "Legacy Name"


def test_accept_allows_6_char_password(client: TestClient, factory, auth_headers) -> None:
    # min_length de la contraseña de invitación bajó de 10 a 6 (M1).
    org = factory.make_org(licenses_total=10)
    token = _invite(client, factory, auth_headers, org, "sixchars@hgtest.test")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "abc123", "username_or_email": "six_user"},
    )
    assert res.status_code == 200, res.text


def test_accept_rejects_5_char_password_422(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    token = _invite(client, factory, auth_headers, org, "fivechars@hgtest.test")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "abc12", "username_or_email": "five_user"},
    )
    assert res.status_code == 422, res.text
