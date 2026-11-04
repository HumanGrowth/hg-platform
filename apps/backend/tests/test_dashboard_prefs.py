"""RH-02: personalización del dashboard por usuario (orden + widgets ocultos)."""
from __future__ import annotations

from hg.modules.identity.models import UserRole

URL = "/api/v1/auth/me/dashboard-prefs/org"


def test_default_is_empty(client, factory, auth_headers) -> None:
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    res = client.get(URL, headers=auth_headers(admin))
    assert res.status_code == 200, res.text
    assert res.json() == {"order": [], "hidden": []}


def test_put_get_roundtrip_and_dedupe(client, factory, auth_headers) -> None:
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    h = auth_headers(admin)
    body = {"order": ["kpi_adoption", "accounts", "kpi_adoption"], "hidden": ["assessment", "assessment"]}
    res = client.put(URL, json=body, headers=h)
    assert res.status_code == 200, res.text
    assert res.json() == {"order": ["kpi_adoption", "accounts"], "hidden": ["assessment"]}
    assert client.get(URL, headers=h).json() == res.json()


def test_reset_restores_default(client, factory, auth_headers) -> None:
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    h = auth_headers(admin)
    client.put(URL, json={"order": ["a"], "hidden": ["b"]}, headers=h)
    assert client.delete(URL, headers=h).status_code == 204
    assert client.get(URL, headers=h).json() == {"order": [], "hidden": []}


def test_prefs_are_personal_per_user(client, factory, auth_headers) -> None:
    org = factory.make_org()
    a = factory.make_user(org=org, role=UserRole.admin)
    b = factory.make_user(org=org, role=UserRole.admin)
    client.put(URL, json={"order": ["x"], "hidden": ["y"]}, headers=auth_headers(a))
    assert client.get(URL, headers=auth_headers(b)).json() == {"order": [], "hidden": []}


def test_rejects_invalid_ids_unknown_dashboard_and_unauthenticated(client, factory, auth_headers) -> None:
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    h = auth_headers(admin)
    assert client.put(URL, json={"order": ["Bad Id!"], "hidden": []}, headers=h).status_code == 422
    assert client.put(URL, json={"order": [f"w{i}" for i in range(61)], "hidden": []}, headers=h).status_code == 422
    assert client.get("/api/v1/auth/me/dashboard-prefs/otro", headers=h).status_code == 422
    assert client.get(URL).status_code in (401, 403)


def test_hg_app_updates_only_own_org_prefs(db) -> None:
    """Con RLS activa (hg_app) la columna nueva se escribe en la propia org y
    no en otra: la política existente de ``users`` ya la cubre."""
    from sqlalchemy import text

    from tests.test_rls import _bootstrap_two_orgs, _set_org

    org_a, org_b = _bootstrap_two_orgs(db)
    db.execute(text("SET LOCAL ROLE hg_app"))
    _set_org(db, org_a.id)
    sql = text("UPDATE users SET dashboard_prefs = '{\"org\": {}}'::jsonb WHERE org_id = :o")
    assert db.execute(sql, {"o": org_a.id}).rowcount == 1
    assert db.execute(sql, {"o": org_b.id}).rowcount == 0
