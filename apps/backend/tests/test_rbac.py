"""RBAC tests (DEV-07): require_role + RBAC/RLS layering."""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from hg.modules.identity.models import UserRole


def test_collaborator_rejected_by_require_role_403(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    collab = factory.make_user(org=org, role=UserRole.collaborator)
    # POST /admin/orgs exige superadmin -> un collaborator recibe 403.
    res = client.post(
        "/api/v1/admin/orgs",
        headers=auth_headers(collab),
        json={"name": "X", "slug": f"x-{org.id.hex[:6]}", "licenses_total": 5},
    )
    assert res.status_code == 403
    assert res.json()["detail"] == "insufficient role"


def test_admin_allowed_to_invite_own_org(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    # require_role("superadmin","admin") permite a un admin de la propia org.
    res = client.post(
        f"/api/v1/admin/orgs/{org.id}/invite",
        headers=auth_headers(admin),
        json={"email": "teammate@hgtest.test", "role": "collaborator"},
    )
    assert res.status_code == 201, res.text


def test_rls_isolates_orgs_under_app_role(factory, db: Session) -> None:
    """Capa RLS bajo el rol de la app: con el contexto de org A, los usuarios
    de org B son invisibles — la misma mecánica que usa get_current_user."""
    org_a = factory.make_org(name="A")
    org_b = factory.make_org(name="B")
    user_a = factory.make_user(org=org_a, email="only-a@hgtest.test")
    factory.make_user(org=org_b, email="only-b@hgtest.test")

    # Bajar al rol de aplicación (RLS activo) y fijar el tenant A.
    db.execute(text("SET LOCAL ROLE hg_app"))
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_a.id)})

    emails = db.execute(text("SELECT email FROM users")).scalars().all()
    assert "only-a@hgtest.test" in emails
    assert "only-b@hgtest.test" not in emails  # RLS filtra la otra org

    # Cambiar a org B: ahora sólo se ve B.
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_b.id)})
    emails_b = db.execute(text("SELECT email FROM users")).scalars().all()
    assert "only-b@hgtest.test" in emails_b
    assert "only-a@hgtest.test" not in emails_b

    # user_a sigue existiendo (sanity, vía bypass): el filtrado es por contexto.
    db.execute(text("RESET ROLE"))
    assert db.get(type(user_a), user_a.id) is not None
