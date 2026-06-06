"""Invitation flow tests (DEV-06/07)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from hg.core.security import generate_opaque_token
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import UserRole


def test_superadmin_creates_org_and_invites(client: TestClient, factory, auth_headers) -> None:
    hg_org = factory.make_org(slug=None, name="HG")
    superadmin = factory.make_user(org=hg_org, role=UserRole.superadmin)

    # Crear org vía API.
    res = client.post(
        "/api/v1/admin/orgs",
        headers=auth_headers(superadmin),
        json={"name": "Client Co", "slug": f"client-{hg_org.id.hex[:6]}", "licenses_total": 10},
    )
    assert res.status_code == 201, res.text
    new_org_id = res.json()["id"]
    factory.session  # noqa: B018 - org creada por la app; la limpiamos abajo

    # Invitar a esa org.
    inv = client.post(
        f"/api/v1/admin/orgs/{new_org_id}/invite",
        headers=auth_headers(superadmin),
        json={"email": "invitee@hgtest.test", "role": "admin"},
    )
    assert inv.status_code == 201, inv.text
    body = inv.json()
    assert body["invite_token"]
    assert body["invite_url"].endswith(body["invite_token"])

    # Limpieza de la org creada por la app (no la trackea el factory).
    from sqlalchemy import delete

    from hg.modules.identity.models import Organization

    factory.session.execute(delete(Organization).where(Organization.id == new_org_id))
    factory.session.commit()


def test_admin_cannot_invite_to_other_org_403(client: TestClient, factory, auth_headers) -> None:
    org_a = factory.make_org(name="Org A")
    org_b = factory.make_org(name="Org B")
    admin_a = factory.make_user(org=org_a, role=UserRole.admin)

    res = client.post(
        f"/api/v1/admin/orgs/{org_b.id}/invite",
        headers=auth_headers(admin_a),
        json={"email": "x@hgtest.test", "role": "collaborator"},
    )
    assert res.status_code == 403


def test_invite_without_licenses_400(client: TestClient, factory, auth_headers) -> None:
    # Org con 1 licencia, ya usada por el admin -> sin cupo.
    org = factory.make_org(licenses_total=1)
    admin = factory.make_user(org=org, role=UserRole.admin)  # licenses_used -> 1
    res = client.post(
        f"/api/v1/admin/orgs/{org.id}/invite",
        headers=auth_headers(admin),
        json={"email": "nope@hgtest.test", "role": "collaborator"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "no licenses available"


def test_accept_invite_creates_user_and_consumes_license(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org(licenses_total=10)
    admin = factory.make_user(org=org, role=UserRole.admin)

    inv = client.post(
        f"/api/v1/admin/orgs/{org.id}/invite",
        headers=auth_headers(admin),
        json={"email": "fresh@hgtest.test", "role": "collaborator"},
    ).json()

    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": inv["invite_token"], "password": "Brand0New!!", "full_name": "Fresh Hire"},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["user"]["email"] == "fresh@hgtest.test"
    assert body["user"]["role"] == "collaborator"

    # Licencias consumidas: admin (1) + nuevo user (1) = 2.
    factory.session.expire_all()
    refreshed = factory.session.get(type(org), org.id)
    assert refreshed.licenses_used == 2

    # No reutilizable -> 410.
    again = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": inv["invite_token"], "password": "Brand0New!!", "full_name": "Fresh Hire"},
    )
    assert again.status_code == 410


def _seed_invitation(factory, *, org, expires_at, accepted_at=None, revoked_at=None) -> str:
    """Inserta una invitación directa (committed) y devuelve el token plano."""
    plain, token_hash = generate_opaque_token()
    inv = Invitation(
        org_id=org.id,
        email=f"seed-{plain[:6]}@hgtest.test",
        role=UserRole.collaborator,
        token_hash=token_hash,
        expires_at=expires_at,
        accepted_at=accepted_at,
        revoked_at=revoked_at,
    )
    factory.session.add(inv)
    factory.session.commit()
    return plain


def test_accept_invite_expired_410(client: TestClient, factory) -> None:
    org = factory.make_org()
    token = _seed_invitation(factory, org=org, expires_at=datetime.now(UTC) - timedelta(days=1))
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Whatever!!12", "full_name": "Late"},
    )
    assert res.status_code == 410


def test_accept_invite_already_used_410(client: TestClient, factory) -> None:
    org = factory.make_org()
    token = _seed_invitation(
        factory, org=org,
        expires_at=datetime.now(UTC) + timedelta(days=1),
        accepted_at=datetime.now(UTC),
    )
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Whatever!!12", "full_name": "Dup"},
    )
    assert res.status_code == 410


def test_accept_invite_revoked_410(client: TestClient, factory) -> None:
    org = factory.make_org()
    token = _seed_invitation(
        factory, org=org,
        expires_at=datetime.now(UTC) + timedelta(days=1),
        revoked_at=datetime.now(UTC),
    )
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": token, "password": "Whatever!!12", "full_name": "Revoked"},
    )
    assert res.status_code == 410
