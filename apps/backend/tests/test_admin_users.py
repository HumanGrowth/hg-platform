"""Admin users endpoints (FU-02): list by org + PATCH with business rules."""
from __future__ import annotations

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from hg.modules.identity import service
from hg.modules.identity.models import Organization, User, UserRole


def _org_used(factory, org_id) -> int:
    factory.session.expire_all()
    return factory.session.get(Organization, org_id).licenses_used


# ─────────────────────────── list ───────────────────────────


def test_superadmin_lists_org_users(client: TestClient, factory, auth_headers) -> None:
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    org = factory.make_org(licenses_total=10)
    for _ in range(4):
        factory.make_user(org=org)

    res = client.get(f"/api/v1/admin/orgs/{org.id}/users", headers=auth_headers(sa))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total"] == 4
    assert len(body["items"]) == 4


def test_admin_lists_other_org_403(client: TestClient, factory, auth_headers) -> None:
    org_a = factory.make_org()
    org_b = factory.make_org()
    admin_a = factory.make_user(org=org_a, role=UserRole.admin)
    res = client.get(f"/api/v1/admin/orgs/{org_b.id}/users", headers=auth_headers(admin_a))
    assert res.status_code == 403


def test_admin_lists_own_org_with_filters(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    for _ in range(3):
        factory.make_user(org=org, role=UserRole.collaborator)

    res = client.get(
        f"/api/v1/admin/orgs/{org.id}/users",
        headers=auth_headers(admin),
        params={"status": "active", "role": "collaborator", "page": 1, "page_size": 2},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["total"] == 3  # 3 collaborators activos
    assert len(body["items"]) == 2  # page_size=2
    assert all(u["role"] == "collaborator" for u in body["items"])


def test_collaborator_forbidden_on_both(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    collab = factory.make_user(org=org, role=UserRole.collaborator)
    target = factory.make_user(org=org)
    assert (
        client.get(f"/api/v1/admin/orgs/{org.id}/users", headers=auth_headers(collab)).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/v1/admin/users/{target.id}",
            headers=auth_headers(collab),
            json={"is_active": False},
        ).status_code
        == 403
    )


# ─────────────────────────── patch: licenses ───────────────────────────


def test_deactivate_user_frees_license(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    user = factory.make_user(org=org)  # used = 2 (admin + user)
    assert _org_used(factory, org.id) == 2

    res = client.patch(
        f"/api/v1/admin/users/{user.id}", headers=auth_headers(admin), json={"is_active": False}
    )
    assert res.status_code == 200, res.text
    assert res.json()["is_active"] is False
    assert _org_used(factory, org.id) == 1


def test_reactivate_without_license_400(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=1)
    admin = factory.make_user(org=org, role=UserRole.admin)  # used = 1
    # Colaborador inactivo que no consume licencia (org al tope con el admin).
    collab = factory.make_user(org=org, is_active=False)
    factory.session.execute(
        update(Organization).where(Organization.id == org.id).values(licenses_used=1)
    )
    factory.session.commit()

    res = client.patch(
        f"/api/v1/admin/users/{collab.id}", headers=auth_headers(admin), json={"is_active": True}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "no licenses available"


# ─────────────────────────── patch: cross-org / self / role ───────────────────────────


def test_manager_must_be_same_org_400(client: TestClient, factory, auth_headers) -> None:
    org_a = factory.make_org()
    org_b = factory.make_org()
    admin_a = factory.make_user(org=org_a, role=UserRole.admin)
    target = factory.make_user(org=org_a)
    other = factory.make_user(org=org_b)

    res = client.patch(
        f"/api/v1/admin/users/{target.id}",
        headers=auth_headers(admin_a),
        json={"manager_id": str(other.id)},
    )
    assert res.status_code == 400


def test_admin_cannot_change_own_role_400(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    res = client.patch(
        f"/api/v1/admin/users/{admin.id}", headers=auth_headers(admin), json={"role": "manager"}
    )
    assert res.status_code == 400


def test_cannot_deactivate_last_superadmin(db: Session, factory) -> None:
    """Service-level: el seed tiene un superadmin global, así que neutralizamos
    los superadmins activos dentro de la transacción (rollback) para aislar."""
    db.execute(update(User).where(User.role == UserRole.superadmin).values(is_active=False))
    org = Organization(name="HGtest", slug="hgtest-last-sa", licenses_total=5)
    db.add(org)
    db.flush()
    only_sa = User(
        org_id=org.id,
        email="only-sa@hgtest.test",
        hashed_password="x" * 20,
        full_name="Only SA",
        role=UserRole.superadmin,
        is_active=True,
    )
    db.add(only_sa)
    db.flush()

    with pytest.raises(HTTPException) as exc:
        service.update_user(db, user_id=only_sa.id, actor=only_sa, payload={"is_active": False})
    assert exc.value.status_code == 400
