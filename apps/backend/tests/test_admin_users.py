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
    """Uso del pool = users activos de la Empresa de la org (CE-06: computado)."""
    factory.session.expire_all()
    org = factory.session.get(Organization, org_id)
    return service.company_active_users(factory.session, org.company_id)


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
    org = factory.make_org(licenses_total=1)  # → pool de la Empresa = 1
    admin = factory.make_user(org=org, role=UserRole.admin)  # 1 user activo → pool lleno
    # Colaborador inactivo (no consume); reactivarlo excede el pool.
    collab = factory.make_user(org=org, is_active=False)

    res = client.patch(
        f"/api/v1/admin/users/{collab.id}", headers=auth_headers(admin), json={"is_active": True}
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "company license pool exhausted"


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
    from hg.modules.identity.models import Company

    company = Company(name="HGtest", slug="hgtest-last-sa-co", licenses_total=5)
    db.add(company)
    db.flush()
    org = Organization(name="HGtest", slug="hgtest-last-sa", company_id=company.id)
    db.add(org)
    db.flush()
    only_sa = User(
        org_id=org.id,
        company_id=company.id,
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


# ─────────────────────────── M2 · hard delete de usuario ───────────────────────────


def test_superadmin_hard_deletes_user_cascades_and_set_null(
    client: TestClient, factory, auth_headers
) -> None:
    from datetime import UTC, datetime, timedelta
    from uuid import uuid4

    from sqlalchemy import func, select

    from hg.modules.identity.models import UserSession

    db: Session = factory.session
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    org = factory.make_org(licenses_total=10)
    manager = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=manager.id)
    manager_id, report_id = manager.id, report.id  # capturar antes del borrado
    # Fila hija (CASCADE): una sesión del manager.
    db.add(
        UserSession(
            user_id=manager.id, org_id=org.id, refresh_token_hash=f"h-{uuid4().hex}",
            expires_at=datetime.now(UTC) + timedelta(days=1),
        )
    )
    db.commit()

    res = client.delete(f"/api/v1/admin/users/{manager_id}", headers=auth_headers(sa))
    assert res.status_code == 204, res.text

    db.expire_all()
    # Queries frescas (evitan ObjectDeletedError del identity-map sobre filas
    # borradas fuera de esta sesión).
    assert db.scalar(select(User.id).where(User.id == manager_id)) is None  # borrado
    # CASCADE: la sesión hija desapareció (sin filas huérfanas).
    assert (
        db.scalar(
            select(func.count()).select_from(UserSession).where(UserSession.user_id == manager_id)
        )
        == 0
    )
    # SET NULL: el report sobrevive con manager_id nulo.
    assert db.scalar(select(User.id).where(User.id == report_id)) == report_id
    assert db.scalar(select(User.manager_id).where(User.id == report_id)) is None
    # Idempotencia vía API: borrar de nuevo → 404.
    again = client.delete(f"/api/v1/admin/users/{manager_id}", headers=auth_headers(sa))
    assert again.status_code == 404


def test_admin_cannot_hard_delete_403(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    target = factory.make_user(org=org)
    res = client.delete(f"/api/v1/admin/users/{target.id}", headers=auth_headers(admin))
    assert res.status_code == 403


def test_cannot_delete_self_400(client: TestClient, factory, auth_headers) -> None:
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    res = client.delete(f"/api/v1/admin/users/{sa.id}", headers=auth_headers(sa))
    assert res.status_code == 400
    assert "yourself" in res.json()["detail"]


def test_cannot_delete_last_superadmin(factory) -> None:
    # A nivel service: borrar al único superadmin activo (con un actor distinto)
    # está bloqueado. Vía API esto lo tapa la regla de auto-borrado; el service
    # es la última línea de defensa.
    from sqlalchemy import update as sa_update

    db: Session = factory.session
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    actor = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    # Aislar: dejar a `sa` como el único superadmin ACTIVO (otros tests commitean
    # superadmins que no se hacen rollback en el path superadmin).
    db.execute(
        sa_update(User)
        .where(User.role == UserRole.superadmin, User.id != sa.id)
        .values(is_active=False)
    )
    db.commit()
    with pytest.raises(HTTPException) as exc:
        service.hard_delete_user(db, user_id=sa.id, actor=actor)
    assert exc.value.status_code == 400
    assert "last superadmin" in exc.value.detail
