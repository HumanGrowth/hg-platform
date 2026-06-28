"""PATCH /api/v1/auth/me — editar el propio perfil (app-polish-05)."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_update_me_changes_name_and_job_title(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org, full_name="Old Name", job_title=None)
    res = client.patch(
        "/api/v1/auth/me",
        headers=auth_headers(user),
        json={"full_name": "Nueva Persona", "job_title": "Product Designer"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["full_name"] == "Nueva Persona"
    assert body["job_title"] == "Product Designer"
    assert body["email"] == user.email  # email no cambia
    # persistió
    me = client.get("/api/v1/auth/me", headers=auth_headers(user)).json()
    assert me["full_name"] == "Nueva Persona"
    assert me["job_title"] == "Product Designer"


def test_update_me_rejects_empty_name(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    res = client.patch(
        "/api/v1/auth/me", headers=auth_headers(user), json={"full_name": ""}
    )
    assert res.status_code == 422
