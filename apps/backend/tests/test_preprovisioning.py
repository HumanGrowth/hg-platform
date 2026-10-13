"""Pre-provisioning (BP-01): usuarios invitados con la cuenta ya configurada.

Invitar crea la fila ``User`` con ``is_invited=True`` (inactiva, hash centinela);
aceptar la invitación la ACTIVA conservando rol/manager/depto. Los invitados no
participan del login ni de las métricas y no se reactivan a mano.
"""
from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import User, UserRole
from hg.modules.identity.service import (
    company_active_users,
    find_user_by_email,
    get_or_create_invited_user,
)


def _email() -> str:
    return f"inv-{uuid4().hex[:10]}@hgtest.test"


def _invite(client: TestClient, headers, org, email: str, role: str = "collaborator") -> dict:
    res = client.post(
        f"/api/v1/admin/orgs/{org.id}/invite", headers=headers, json={"email": email, "role": role}
    )
    assert res.status_code == 201, res.text
    return res.json()


def test_invite_creates_inactive_invited_user(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    email = _email()
    _invite(client, auth_headers(admin), org, email)

    factory.session.expire_all()
    user = find_user_by_email(factory.session, org.id, email)
    assert user is not None
    assert user.is_invited is True
    assert user.is_active is False
    # No consume licencia hasta aceptar: solo cuenta el admin.
    assert company_active_users(factory.session, org.company_id) == 1


def test_accept_activates_invited_user_and_keeps_configuration(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    manager = factory.make_user(org=org, role=UserRole.manager)
    email = _email()
    inv = _invite(client, auth_headers(admin), org, email)

    # La estructura se define ANTES de que la persona acepte.
    factory.session.expire_all()
    user = find_user_by_email(factory.session, org.id, email)
    assert user is not None
    user.manager_id = manager.id
    user.department = "Ventas"
    user.full_name = "Ana Pérez"
    factory.session.commit()
    user_id = user.id

    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": inv["invite_token"], "password": "Brand0New!!", "username_or_email": "anap"},
    )
    assert res.status_code == 200, res.text

    factory.session.expire_all()
    activated = factory.session.get(User, user_id)
    assert activated is not None
    assert activated.id == user_id  # misma fila, no se creó otra
    assert activated.is_active is True and activated.is_invited is False
    assert activated.manager_id == manager.id
    assert activated.department == "Ventas"
    assert activated.full_name == "Ana Pérez"  # no se pisa con el formulario
    assert activated.username == "anap"
    assert company_active_users(factory.session, org.company_id) == 3

    # La contraseña nueva funciona.
    login = client.post("/api/v1/auth/login", json={"email": email, "password": "Brand0New!!"})
    assert login.status_code == 200, login.text


def test_accept_twice_is_rejected(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    inv = _invite(client, auth_headers(admin), org, _email())
    body = {"token": inv["invite_token"], "password": "Brand0New!!", "username_or_email": "dup1"}
    assert client.post("/api/v1/auth/accept-invite", json=body).status_code == 200
    assert client.post("/api/v1/auth/accept-invite", json=body).status_code == 410


def test_legacy_invitation_without_user_row_still_creates_user(
    client: TestClient, factory
) -> None:
    """Invitaciones emitidas antes del pre-provisioning no tienen fila User."""
    from datetime import UTC, datetime, timedelta

    from hg.core.security import generate_opaque_token

    org = factory.make_org(licenses_total=10)
    plain, token_hash = generate_opaque_token()
    email = _email()
    factory.session.add(
        Invitation(
            org_id=org.id, email=email, role=UserRole.collaborator, token_hash=token_hash,
            expires_at=datetime.now(UTC) + timedelta(days=7),
        )
    )
    factory.session.commit()
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": plain, "password": "Brand0New!!", "username_or_email": "legacy1"},
    )
    assert res.status_code == 200, res.text
    factory.session.expire_all()
    user = find_user_by_email(factory.session, org.id, email)
    assert user is not None and user.is_active and not user.is_invited


def test_invited_user_cannot_login_and_does_not_break_same_email_elsewhere(
    client: TestClient, factory
) -> None:
    email = _email()
    org_a = factory.make_org()
    org_b = factory.make_org()
    factory.make_user(org=org_a, email=email, password="Passw0rd!!")
    get_or_create_invited_user(
        factory.session, org=org_b, email=email, role=UserRole.collaborator
    )
    factory.session.commit()

    # El activo entra sin org_slug (el invitado no cuenta como "email repetido").
    ok = client.post("/api/v1/auth/login", json={"email": email, "password": "Passw0rd!!"})
    assert ok.status_code == 200, ok.text

    # Un invitado solo (sin cuenta activa) recibe 401, nunca 500.
    only = _email()
    get_or_create_invited_user(
        factory.session, org=org_b, email=only, role=UserRole.collaborator
    )
    factory.session.commit()
    res = client.post("/api/v1/auth/login", json={"email": only, "password": "cualquiera"})
    assert res.status_code == 401


def test_invited_user_cannot_be_reactivated_manually(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.company_admin)
    invited = get_or_create_invited_user(
        factory.session, org=org, email=_email(), role=UserRole.collaborator
    )
    factory.session.commit()

    res = client.patch(
        f"/api/v1/company/members/{invited.id}",
        headers=auth_headers(admin),
        json={"is_active": True},
    )
    assert res.status_code == 409, res.text

    res = client.patch(
        f"/api/v1/admin/users/{invited.id}",
        headers=auth_headers(factory.make_user(org=org, role=UserRole.admin)),
        json={"is_active": True},
    )
    assert res.status_code == 409, res.text


def test_invite_existing_active_user_is_conflict(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    existing = factory.make_user(org=org)
    res = client.post(
        f"/api/v1/admin/orgs/{org.id}/invite",
        headers=auth_headers(admin),
        json={"email": existing.email, "role": "collaborator"},
    )
    assert res.status_code == 409


def test_reinvite_revokes_previous_token(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    email = _email()
    first = _invite(client, auth_headers(admin), org, email)
    second = _invite(client, auth_headers(admin), org, email)
    assert first["invite_token"] != second["invite_token"]

    old = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": first["invite_token"], "password": "Brand0New!!", "username_or_email": "reinv1"},
    )
    assert old.status_code == 410  # revocada
    new = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": second["invite_token"], "password": "Brand0New!!", "username_or_email": "reinv1"},
    )
    assert new.status_code == 200, new.text
    factory.session.expire_all()
    assert len(factory.session.scalars(select(User).where(User.org_id == org.id)).all()) == 2


def test_revoke_drops_invited_user_without_dependents(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    email = _email()
    inv = _invite(client, auth_headers(admin), org, email)
    inv_id = inv["invitation_id"]

    assert client.delete(f"/api/v1/admin/invitations/{inv_id}", headers=auth_headers(admin)).status_code == 204
    factory.session.expire_all()
    assert find_user_by_email(factory.session, org.id, email) is None


def test_revoke_keeps_invited_manager_with_reports(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)
    email = _email()
    inv = _invite(client, auth_headers(admin), org, email, role="manager")
    factory.session.expire_all()
    manager = find_user_by_email(factory.session, org.id, email)
    assert manager is not None
    factory.make_user(org=org, manager_id=manager.id)
    client.delete(f"/api/v1/admin/invitations/{inv['invitation_id']}", headers=auth_headers(admin))
    factory.session.expire_all()
    assert find_user_by_email(factory.session, org.id, email) is not None  # sigue como preparado


def test_invited_users_excluded_from_team_and_listed_with_status(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.company_admin)
    manager = factory.make_user(org=org, role=UserRole.manager)
    invited = get_or_create_invited_user(
        factory.session, org=org, email=_email(), role=UserRole.collaborator
    )
    invited.manager_id = manager.id
    factory.session.commit()

    team = client.get("/api/v1/manager/me/team", headers=auth_headers(manager))
    assert team.status_code == 200, team.text
    assert team.json()["total"] == 0  # el invitado no cuenta como reporte activo

    members = client.get("/api/v1/company/members", headers=auth_headers(admin)).json()
    row = next(m for m in members if m["id"] == str(invited.id))
    assert row["is_invited"] is True and row["is_active"] is False
    assert row["invite_status"] == "staged"  # sin invitación enviada todavía

    invited_only = client.get(
        f"/api/v1/admin/orgs/{org.id}/users?status=invited",
        headers=auth_headers(factory.make_user(org=org, role=UserRole.admin)),
    )
    assert invited_only.status_code == 200, invited_only.text
    assert [u["id"] for u in invited_only.json()["items"]] == [str(invited.id)]
