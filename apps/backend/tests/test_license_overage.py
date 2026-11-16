"""LC-06: guardia de sobrecupo en bulk e invitaciones + accept-invite sin cupo (ADR-0016)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch
from uuid import uuid4

import openpyxl
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select

from hg.core.security import generate_opaque_token
from hg.modules.company.bulk_service import TEMPLATE_HEADERS, XLSX_MIME
from hg.modules.company.license_guard import projected_license_usage
from hg.modules.company.models import CompanyLifecycleEvent
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import User, UserRole

API = "/api/v1"
SEND = "hg.modules.identity.service.email_service.send"


def _email() -> str:
    return f"lo-{uuid4().hex[:10]}@hgtest.test"


def _xlsx(slug: str, emails: list[str]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.append(TEMPLATE_HEADERS)
    for e in emails:
        ws.append([slug, e, "Nuevo", "collaborator", ""])
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _bulk(client: TestClient, headers, content: bytes, **params):
    return client.post(
        f"{API}/company/members/bulk-import",
        headers=headers,
        params=params or None,
        files={"file": ("m.xlsx", content, XLSX_MIME)},
    )


def _staged(factory, org, n: int) -> list[User]:
    """n invitados pre-cargados SIN correo enviado (staged)."""
    return [
        factory.make_user(org=org, email=_email(), is_invited=True, is_active=False) for _ in range(n)
    ]


def _live_invitation(factory, user: User, *, expires_in: timedelta = timedelta(days=3), revoked=False):
    inv = Invitation(
        org_id=user.org_id,
        email=user.email,
        role=user.role,
        token_hash=uuid4().hex,
        expires_at=datetime.now(UTC) + expires_in,
        revoked_at=datetime.now(UTC) if revoked else None,
    )
    factory.session.add(inv)
    factory.session.commit()
    return inv


def _prior_live_invites(factory, org, n: int) -> None:
    """n invitados que YA tienen invitación vigente. El bulk limita las filas nuevas contra
    activos + creados en la carrera, pero NO contra invitados previos: ahí aparece el sobrecupo."""
    for u in _staged(factory, org, n):
        _live_invitation(factory, u)


@pytest.fixture
def co(factory):
    """Empresa con pool=5 y un company_admin activo (usa 1 licencia)."""

    def make(pool: int = 5, role: UserRole = UserRole.company_admin):
        company = factory.make_company(licenses_total=pool)
        slug = f"lo-{uuid4().hex[:8]}"
        org = factory.make_org(slug=slug, company=company)
        admin = factory.make_user(org=org, role=role)
        return SimpleNamespace(company=company, org=org, admin=admin, slug=slug)

    return make


def _events(factory, company):
    factory.session.expire_all()
    return list(
        factory.session.scalars(
            select(CompanyLifecycleEvent).where(
                CompanyLifecycleEvent.company_id == company.id,
                CompanyLifecycleEvent.event_type == "overage_acknowledged",
            )
        )
    )


# ───────────────────── projected_license_usage (pura) ─────────────────────


def test_projected_usage_counts_only_live_invitations_as_invited(factory, co) -> None:
    c = co(pool=10)
    a, b, expired, revoked, _staged_no_invite = _staged(factory, c.org, 5)
    _live_invitation(factory, a)
    _live_invitation(factory, b)
    _live_invitation(factory, expired, expires_in=timedelta(days=-1))
    _live_invitation(factory, revoked, revoked=True)

    u = projected_license_usage(factory.session, c.company.id, extra_invites=3)
    assert (u.active, u.invited, u.to_invite, u.pool) == (1, 2, 3, 10)
    assert u.overage == 0
    assert projected_license_usage(factory.session, c.company.id, 9).overage == 2  # 1+2+9-10
    assert projected_license_usage(factory.session, c.company.id, 0).as_dict() == {
        "active": 1, "invited": 2, "to_invite": 0, "pool": 10, "overage": 0,
    }  # fmt: skip


def test_projected_usage_negative_extra_is_clamped(factory, co) -> None:
    c = co()
    assert projected_license_usage(factory.session, c.company.id, -4).to_invite == 0


# ───────────────────── POST /company/invitations/send ─────────────────────


def test_send_without_overage_sends_and_leaves_no_event(client, factory, co, auth_headers) -> None:
    c = co(pool=5)  # activos 1 + 4 por invitar = 5 → sin sobrecupo
    _staged(factory, c.org, 4)
    with patch(SEND) as send:
        res = client.post(f"{API}/company/invitations/send", headers=auth_headers(c.admin), json={})
    assert res.status_code == 200, res.text
    assert res.json()["enviadas"] == 4
    assert send.call_count == 4
    assert _events(factory, c.company) == []


def test_send_with_overage_409_and_zero_emails(client, factory, co, auth_headers) -> None:
    c = co(pool=5)
    users = _staged(factory, c.org, 5)  # 1 + 5 = 6 > 5
    with patch(SEND) as send:
        res = client.post(f"{API}/company/invitations/send", headers=auth_headers(c.admin), json={})
    assert res.status_code == 409, res.text
    d = res.json()["detail"]
    assert d["code"] == "license_overage"
    assert (d["active"], d["invited"], d["to_invite"], d["pool"], d["overage"]) == (1, 0, 5, 5, 1)
    send.assert_not_called()
    assert _events(factory, c.company) == []
    n = factory.session.scalar(
        select(func.count()).select_from(Invitation).where(Invitation.org_id == c.org.id)
    )
    assert n == 0
    assert all(u.is_invited for u in users)


@pytest.mark.parametrize("role", [UserRole.company_admin, UserRole.admin])
def test_send_with_acknowledgement_sends_and_records_event(
    client, factory, co, auth_headers, role
) -> None:
    c = co(pool=5, role=role)
    _staged(factory, c.org, 5)
    with patch(SEND) as send:
        res = client.post(
            f"{API}/company/invitations/send",
            headers=auth_headers(c.admin),
            json={"acknowledge_overage": True},
        )
    assert res.status_code == 200, res.text
    assert res.json()["enviadas"] == 5
    assert send.call_count == 5
    (ev,) = _events(factory, c.company)
    assert ev.actor_user_id == c.admin.id
    assert ev.created_at is not None
    assert ev.meta == {
        "active": 1, "invited": 0, "to_invite": 5, "pool": 5, "overage": 1, "source": "send_invitations",
    }  # fmt: skip


def test_superadmin_can_acknowledge_for_a_company(client, factory, co, auth_headers) -> None:
    c = co(pool=2)
    _staged(factory, c.org, 3)
    su = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    url = f"{API}/company/invitations/send"
    with patch(SEND) as send:
        no_ack = client.post(url, headers=auth_headers(su), params={"company_id": str(c.company.id)}, json={})
        assert no_ack.status_code == 409
        send.assert_not_called()
        ok = client.post(
            url, headers=auth_headers(su), params={"company_id": str(c.company.id)},
            json={"acknowledge_overage": True},
        )  # fmt: skip
    assert ok.status_code == 200
    assert _events(factory, c.company)[0].actor_user_id == su.id


def test_acknowledge_flag_without_overage_records_nothing(client, factory, co, auth_headers) -> None:
    c = co(pool=10)
    _staged(factory, c.org, 2)
    with patch(SEND):
        res = client.post(
            f"{API}/company/invitations/send", headers=auth_headers(c.admin), json={"acknowledge_overage": True}
        )
    assert res.status_code == 200
    assert _events(factory, c.company) == []


def test_resending_live_invitations_does_not_add_to_projection(client, factory, co, auth_headers) -> None:
    """Los de invitación vigente ya cuentan en `invited`: reenviarles no suma `to_invite`."""
    c = co(pool=3)
    users = _staged(factory, c.org, 2)
    for u in users:
        _live_invitation(factory, u)  # 1 activo + 2 vigentes = 3 = pool
    with patch(SEND) as send:
        res = client.post(
            f"{API}/company/invitations/send",
            headers=auth_headers(c.admin),
            json={"user_ids": [str(u.id) for u in users]},
        )
    assert res.status_code == 200, res.text
    assert send.call_count == 2


# ───────────────────── POST /company/members/bulk-import ─────────────────────


def test_bulk_send_with_overage_409_zero_emails_and_nothing_written(client, factory, co, auth_headers) -> None:
    c = co(pool=5)
    _prior_live_invites(factory, c.org, 3)  # 1 activo + 3 vigentes
    emails = [_email() for _ in range(3)]  # +3 por invitar → 7 > 5
    with patch(SEND) as send:
        res = _bulk(client, auth_headers(c.admin), _xlsx(c.slug, emails), send_invitations=True)
    assert res.status_code == 409, res.text
    d = res.json()["detail"]
    assert (d["code"], d["active"], d["invited"], d["to_invite"], d["pool"], d["overage"]) == (
        "license_overage", 1, 3, 3, 5, 2,
    )  # fmt: skip
    send.assert_not_called()
    factory.session.expire_all()
    created = factory.session.scalar(select(func.count()).select_from(User).where(User.email.in_(emails)))
    assert created == 0  # el 409 revierte el import: se reintenta con el reconocimiento
    assert _events(factory, c.company) == []


def test_bulk_send_with_acknowledgement_creates_sends_and_records(client, factory, co, auth_headers) -> None:
    c = co(pool=5)
    _prior_live_invites(factory, c.org, 3)
    emails = [_email() for _ in range(3)]
    with patch(SEND) as send:
        res = _bulk(
            client, auth_headers(c.admin), _xlsx(c.slug, emails),
            send_invitations=True, acknowledge_overage=True,
        )  # fmt: skip
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["creados"] == 3
    assert body["invitaciones_enviadas"] == 3
    assert send.call_count == 3
    (ev,) = _events(factory, c.company)
    assert ev.actor_user_id == c.admin.id
    assert ev.meta["source"] == "bulk_import"
    assert (ev.meta["to_invite"], ev.meta["overage"]) == (3, 2)


def test_bulk_send_without_overage_works_as_before(client, factory, co, auth_headers) -> None:
    c = co(pool=10)
    with patch(SEND) as send:
        res = _bulk(client, auth_headers(c.admin), _xlsx(c.slug, [_email(), _email()]), send_invitations=True)
    assert res.status_code == 200, res.text
    assert res.json()["invitaciones_enviadas"] == 2
    assert send.call_count == 2
    assert _events(factory, c.company) == []


@pytest.mark.parametrize("params", [{"validate_only": True}, {}, {"validate_only": True, "send_invitations": True}])
def test_bulk_without_sending_never_blocks_and_reports_structured_usage(
    client, factory, co, auth_headers, params
) -> None:
    c = co(pool=5)
    _prior_live_invites(factory, c.org, 3)
    emails = [_email() for _ in range(3)]
    with patch(SEND) as send:
        res = _bulk(client, auth_headers(c.admin), _xlsx(c.slug, emails), **params)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["licencias"] == {"active": 1, "invited": 3, "to_invite": 3, "pool": 5, "overage": 2}
    assert any("superan las licencias" in w for w in body["advertencias"])  # advertencia textual intacta
    send.assert_not_called()
    assert body["invitaciones_enviadas"] == 0


def test_bulk_rows_beyond_the_pool_are_still_row_errors(client, factory, co, auth_headers) -> None:
    """Comportamiento previo que NO cambia: el import no deja crear más filas que el pool."""
    c = co(pool=3)
    res = _bulk(client, auth_headers(c.admin), _xlsx(c.slug, [_email() for _ in range(4)]))
    body = res.json()
    assert (body["creados"], body["errores"]) == (2, 2)


def test_bulk_second_send_does_not_recount_live_invitations(client, factory, co, auth_headers) -> None:
    c = co(pool=4)
    emails = [_email() for _ in range(3)]  # 1 + 3 = 4 = pool
    content = _xlsx(c.slug, emails)
    with patch(SEND):
        first = _bulk(client, auth_headers(c.admin), content, send_invitations=True)
        again = _bulk(client, auth_headers(c.admin), content, send_invitations=True)
    assert first.status_code == 200 and again.status_code == 200
    assert again.json()["licencias"] == {"active": 1, "invited": 3, "to_invite": 0, "pool": 4, "overage": 0}


# ───────────────────── accept-invite sin cupo ─────────────────────


def _accept(client, token: str, email: str):
    return client.post(
        f"{API}/auth/accept-invite",
        json={"token": token, "password": "Passw0rd!!", "username_or_email": email, "accepted_terms": True},
    )


def _invite(factory, org, email: str) -> str:
    plain, token_hash = generate_opaque_token()
    factory.session.add(
        Invitation(
            org_id=org.id, email=email, role=UserRole.collaborator, token_hash=token_hash,
            expires_at=datetime.now(UTC) + timedelta(days=3),
        )
    )  # fmt: skip
    factory.session.commit()
    return plain


def test_accept_invite_without_seat_returns_code_friendly_message_and_notifies_admin(
    client, factory, co
) -> None:
    c = co(pool=1)  # el company_admin ya usa la única licencia
    email = _email()
    token = _invite(factory, c.org, email)
    with patch(SEND) as send:
        res = _accept(client, token, email)
    assert res.status_code == 400, res.text
    d = res.json()["detail"]
    assert d == {
        "code": "license_pool_exhausted",
        "message": "Tu empresa alcanzó su límite de licencias. Avisamos a tu administrador.",
    }
    assert send.call_count == 1
    kw = send.call_args.kwargs
    assert kw["to"] == c.admin.email
    assert kw["template"] == "license_pool_exhausted"
    assert (kw["context"]["active"], kw["context"]["pool"]) == (1, 1)
    assert email not in str(kw)  # sin datos de la persona que lo intentó


def test_pool_exhausted_notification_is_rate_limited_per_company(client, factory, co) -> None:
    c = co(pool=1)
    with patch(SEND) as send:
        for _ in range(3):
            email = _email()
            assert _accept(client, _invite(factory, c.org, email), email).status_code == 400
    assert send.call_count == 1  # no spamea al administrador


def test_pool_exhausted_falls_back_to_admin_role_when_no_company_admin(client, factory, co) -> None:
    c = co(pool=1, role=UserRole.admin)
    email = _email()
    with patch(SEND) as send:
        assert _accept(client, _invite(factory, c.org, email), email).status_code == 400
    assert send.call_args.kwargs["to"] == c.admin.email


def test_accept_invite_with_seat_still_works(client, factory, co) -> None:
    c = co(pool=2)
    email = _email()
    with patch(SEND) as send:
        res = _accept(client, _invite(factory, c.org, email), email)
    assert res.status_code == 200, res.text
    assert "license_pool_exhausted" not in [k["template"] for _, k in send.call_args_list]


def test_other_pool_exhausted_callers_keep_the_plain_error(client, factory, co, auth_headers) -> None:
    """El 400 de admin (invitar/reactivar) no cambió: solo accept-invite tiene código nuevo."""
    c = co(pool=1, role=UserRole.admin)
    res = client.post(
        f"{API}/admin/orgs/{c.org.id}/invite",
        headers=auth_headers(c.admin),
        json={"email": _email(), "role": "collaborator"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "company license pool exhausted"
