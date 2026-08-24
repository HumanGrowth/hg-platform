"""Capa Empresa · TASK 2+3: scope de company_admin (aislamiento A vs B),
autorización por rol, y licencias en cascada (pool + cap). Tests con rol
restringido (no superuser), regla dura #4."""
from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole


def _company_with_two_orgs(factory, *, pool: int = 1000):
    """Una Empresa con 2 orgs y un company_admin en la primera."""
    co = factory.make_company(licenses_total=pool)
    org1 = factory.make_org(company=co, name="Org 1")
    org2 = factory.make_org(company=co, name="Org 2")
    ca = factory.make_user(org=org1, role=UserRole.company_admin, full_name="RRHH")
    return co, org1, org2, ca


# ─────────────────────────── aislamiento Empresa A vs B ───────────────────────────


def test_company_admin_sees_only_own_orgs(client: TestClient, factory, auth_headers) -> None:
    _, org1, org2, ca = _company_with_two_orgs(factory)
    # Empresa B, ajena.
    co_b = factory.make_company()
    org_b = factory.make_org(company=co_b, name="Org B")

    res = client.get("/api/v1/company/organizations", headers=auth_headers(ca))
    assert res.status_code == 200, res.text
    ids = {o["id"] for o in res.json()}
    assert ids == {str(org1.id), str(org2.id)}
    assert str(org_b.id) not in ids


def test_company_admin_cannot_invite_to_other_company_org(
    client: TestClient, factory, auth_headers
) -> None:
    _, _, _, ca = _company_with_two_orgs(factory)
    co_b = factory.make_company()
    org_b = factory.make_org(company=co_b)
    # La org de la Empresa B no existe "para" este company_admin → 404.
    res = client.post(
        f"/api/v1/company/organizations/{org_b.id}/invite",
        headers=auth_headers(ca),
        json={"email": "x@hgtest.test", "role": "collaborator"},
    )
    assert res.status_code == 404


def test_company_admin_cannot_update_member_of_other_company(
    client: TestClient, factory, auth_headers
) -> None:
    _, _, _, ca = _company_with_two_orgs(factory)
    co_b = factory.make_company()
    org_b = factory.make_org(company=co_b)
    member_b = factory.make_user(org=org_b)
    res = client.patch(
        f"/api/v1/company/members/{member_b.id}",
        headers=auth_headers(ca),
        json={"is_active": False},
    )
    assert res.status_code == 404


# ─────────────────────────── autorización por rol ───────────────────────────


def test_admin_role_can_access_company_routes(
    client: TestClient, factory, auth_headers
) -> None:
    # Rol unificado (ago-2026): el admin gestiona toda su empresa (orgs+miembros).
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    assert client.get("/api/v1/company/organizations", headers=auth_headers(admin)).status_code == 200
    assert client.get("/api/v1/company/members", headers=auth_headers(admin)).status_code == 200


def test_admin_role_cannot_create_company(client: TestClient, factory, auth_headers) -> None:
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    res = client.post(
        "/api/v1/admin/companies",
        headers=auth_headers(admin),
        json={"name": "X", "slug": f"x-{uuid4().hex[:6]}", "licenses_total": 10},
    )
    assert res.status_code == 403


# ─────────────────────────── superadmin: companies ───────────────────────────


def test_superadmin_creates_and_lists_company(client: TestClient, factory, auth_headers) -> None:
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    slug = f"acme-{uuid4().hex[:6]}"
    res = client.post(
        "/api/v1/admin/companies",
        headers=auth_headers(sa),
        json={"name": "Acme Group", "slug": slug, "tier": "A", "licenses_total": 100},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["licenses_total"] == 100
    assert body["licenses_used"] == 0
    assert body["org_count"] == 0
    # aparece en el listado
    listing = client.get("/api/v1/admin/companies", headers=auth_headers(sa)).json()
    assert slug in {c["slug"] for c in listing}


# ─────────────────────────── roster ───────────────────────────


def test_company_members_roster(client: TestClient, factory, auth_headers) -> None:
    _, _org1, org2, ca = _company_with_two_orgs(factory)
    factory.make_user(org=org2, full_name="Colaborador 2")
    res = client.get("/api/v1/company/members", headers=auth_headers(ca))
    assert res.status_code == 200, res.text
    members = res.json()
    # ca (org1) + colaborador (org2) → al menos 2, todos de la Empresa.
    names = {m["full_name"] for m in members}
    assert "RRHH" in names and "Colaborador 2" in names
    assert all("dimension_states" in m for m in members)


# ─────────────────────────── licencias en cascada (pool + cap) ───────────────────────────


def test_invite_blocked_when_company_pool_exhausted(
    client: TestClient, factory, auth_headers
) -> None:
    # Pool de la Empresa = 1, ya usado por el company_admin (activo). El cap de
    # la org es alto (50), así que el POOL es el límite que bloquea.
    _, org1, _, ca = _company_with_two_orgs(factory, pool=1)
    res = client.post(
        f"/api/v1/company/organizations/{org1.id}/invite",
        headers=auth_headers(ca),
        json={"email": "nope@hgtest.test", "role": "collaborator"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "company license pool exhausted"


def test_invite_succeeds_within_pool(client: TestClient, factory, auth_headers) -> None:
    _, org1, _, ca = _company_with_two_orgs(factory, pool=10)
    res = client.post(
        f"/api/v1/company/organizations/{org1.id}/invite",
        headers=auth_headers(ca),
        json={"email": f"ok-{uuid4().hex[:6]}@hgtest.test", "role": "collaborator"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["invite_url"].startswith("http")


def test_superadmin_creates_org_in_company(client: TestClient, factory, auth_headers) -> None:
    co, _, _, _ = _company_with_two_orgs(factory)
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    slug = f"neworg-{uuid4().hex[:6]}"
    res = client.post(
        "/api/v1/company/organizations",
        headers=auth_headers(sa),
        params={"company_id": str(co.id)},
        json={"name": "Nueva Org", "slug": slug, "tier": "B"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["user_count"] == 0


# ─────────────────────────── GET /company (Empresa · billing/licencias) ───────────────────────────


def test_company_admin_gets_own_company_with_licenses(
    client: TestClient, factory, auth_headers
) -> None:
    co, _org1, _org2, ca = _company_with_two_orgs(factory, pool=50)
    res = client.get("/api/v1/company/info", headers=auth_headers(ca))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["id"] == str(co.id)
    assert body["licenses_total"] == 50
    assert body["org_count"] == 2
    assert body["licenses_used"] >= 1  # el company_admin activo consume del pool


def test_admin_role_can_get_company(client: TestClient, factory, auth_headers) -> None:
    # El admin puede LEER la info de su empresa (gestiona toda la empresa).
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    assert client.get("/api/v1/company/info", headers=auth_headers(admin)).status_code == 200
