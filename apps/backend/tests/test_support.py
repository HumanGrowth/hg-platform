"""Tests del módulo de soporte (ADR-0015): tickets de usuario, formulario público, panel admin,
aislamiento por RLS y limitador de tasa."""
from __future__ import annotations

import re
from collections.abc import Callable, Generator
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from hg.core import rate_limit
from hg.db import SessionLocal
from hg.modules.identity.models import Company, Organization, User, UserRole
from hg.modules.support.models import SupportTicket, SupportTicketEvent

API = "/api/v1"
PUBLIC_EMAIL_DOMAIN = "@sptest.test"


@pytest.fixture(autouse=True)
def _cleanup_public_tickets() -> Generator[None, None, None]:
    """Los tickets públicos no tienen org, así que el CASCADE de la Company no los borra."""
    yield
    s = SessionLocal()
    s.execute(
        text("DELETE FROM support_tickets WHERE reporter_email LIKE :p"),
        {"p": f"%{PUBLIC_EMAIL_DOMAIN}"},
    )
    s.commit()
    s.close()


@pytest.fixture
def sent_emails(monkeypatch: pytest.MonkeyPatch) -> list[dict]:  # type: ignore[type-arg]
    sent: list[dict] = []  # type: ignore[type-arg]

    def _fake_send(**kwargs):  # type: ignore[no-untyped-def]
        sent.append(kwargs)
        return "sent"

    monkeypatch.setattr("hg.modules.support.service.email_service.send", _fake_send)
    return sent


@pytest.fixture
def ctx(factory: SimpleNamespace) -> SimpleNamespace:
    org = factory.make_org()
    other_org = factory.make_org()
    return SimpleNamespace(
        org=org,
        other_org=other_org,
        user=factory.make_user(org=org),
        colleague=factory.make_user(org=org),
        outsider=factory.make_user(org=other_org),
        admin=factory.make_user(org=org, role=UserRole.superadmin),
    )


def _create(client: TestClient, headers: dict[str, str], **over: object) -> dict:  # type: ignore[type-arg]
    body = {
        "subject": "No me carga el video",
        "body": "El módulo se queda en negro al darle play.",
        "category": "bug",
        "page_url": "/modulos/demo",
        "locale": "es",
    }
    body.update(over)
    res = client.post(f"{API}/me/support/tickets", json=body, headers=headers)
    assert res.status_code == 201, res.text
    return res.json()


def _public_payload(**over: object) -> dict:  # type: ignore[type-arg]
    payload = {
        "name": "Persona Sin Acceso",
        "email": f"p-{uuid4().hex[:8]}{PUBLIC_EMAIL_DOMAIN}",
        "subject": "No me llega la invitación",
        "body": "Pasaron dos días y no recibí el correo de invitación.",
        "category": "access",
    }
    payload.update(over)
    return payload


def _post_public(client: TestClient, payload: dict) -> object:  # type: ignore[type-arg]
    # IP única por llamada para no chocar con el límite por IP entre tests/corridas.
    ip = f"10.{uuid4().int % 250}.{uuid4().int % 250}.{uuid4().int % 250}"
    return client.post(f"{API}/support/tickets", json=payload, headers={"X-Forwarded-For": ip})


def _db_row(sql: str, **params: object):  # type: ignore[no-untyped-def]
    s = SessionLocal()
    try:
        return s.execute(text(sql), params).mappings().first()
    finally:
        s.close()


# ─────────────────────────── Usuario autenticado ───────────────────────────


def test_create_ticket_captures_server_side_context(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
    sent_emails: list[dict],  # type: ignore[type-arg]
) -> None:
    data = _create(client, auth_headers(ctx.user))
    assert re.fullmatch(r"SP-\d{4,}", data["code"])
    assert data["status"] == "new"
    assert data["events"] == []  # el evento "created" no se muestra al usuario

    row = _db_row("SELECT * FROM support_tickets WHERE id = :i", i=data["id"])
    assert row["org_id"] == ctx.org.id
    assert row["user_id"] == ctx.user.id
    assert row["reporter_email"] == ctx.user.email
    assert row["reporter_role"] == "collaborator"
    assert row["source"] == "app"
    assert row["app_version"]

    templates = {e["template"] for e in sent_emails}
    assert templates == {"support_ack", "support_internal"}


def test_user_sees_only_own_tickets(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
) -> None:
    mine = _create(client, auth_headers(ctx.user))
    theirs = _create(client, auth_headers(ctx.colleague), subject="Ticket de mi colega")

    listing = client.get(f"{API}/me/support/tickets", headers=auth_headers(ctx.user)).json()
    assert [t["id"] for t in listing["items"]] == [mine["id"]]
    assert listing["total"] == 1

    # Mismo org, otro usuario → 404 (no 403: no revela que existe).
    res = client.get(f"{API}/me/support/tickets/{theirs['id']}", headers=auth_headers(ctx.user))
    assert res.status_code == 404
    res = client.post(
        f"{API}/me/support/tickets/{theirs['id']}/reply",
        json={"body": "intento"}, headers=auth_headers(ctx.user),
    )
    assert res.status_code == 404


def test_ticket_validation(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
) -> None:
    h = auth_headers(ctx.user)
    res = client.post(f"{API}/me/support/tickets", json={"subject": "x", "body": "y"}, headers=h)
    assert res.status_code == 422
    res = client.post(f"{API}/me/support/tickets", json={"subject": "Asunto válido", "body": "Detalle válido", "category": "nope"}, headers=h)
    assert res.status_code == 422
    assert client.post(f"{API}/me/support/tickets", json={}).status_code in (401, 403)


def test_admin_reply_user_reply_and_internal_notes(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
    sent_emails: list[dict],  # type: ignore[type-arg]
) -> None:
    ticket = _create(client, auth_headers(ctx.user))
    tid = ticket["id"]
    admin_h = auth_headers(ctx.admin)

    # Nota interna: la ve el admin, nunca el usuario.
    res = client.post(f"{API}/admin/support/tickets/{tid}/note", json={"body": "Parece el CDN"}, headers=admin_h)
    assert res.status_code == 200
    assert any(e["is_internal"] and e["body"] == "Parece el CDN" for e in res.json()["events"])

    # Respuesta del admin → status answered, first_response_at, email al usuario.
    sent_emails.clear()
    res = client.post(f"{API}/admin/support/tickets/{tid}/reply", json={"body": "Probá recargar."}, headers=admin_h)
    assert res.status_code == 200
    detail = res.json()
    assert detail["status"] == "answered"
    assert detail["first_response_at"] is not None
    assert [e["template"] for e in sent_emails] == ["support_reply"]

    mine = client.get(f"{API}/me/support/tickets/{tid}", headers=auth_headers(ctx.user)).json()
    bodies = [e["body"] for e in mine["events"]]
    assert bodies == ["Probá recargar."]  # sin la nota interna
    assert "Parece el CDN" not in str(mine)

    # El usuario responde → el ticket vuelve a "new".
    res = client.post(f"{API}/me/support/tickets/{tid}/reply", json={"body": "Sigue igual"}, headers=auth_headers(ctx.user))
    assert res.status_code == 200
    assert res.json()["status"] == "new"


def test_admin_patch_status_sets_resolved_at(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
) -> None:
    tid = _create(client, auth_headers(ctx.user))["id"]
    admin_h = auth_headers(ctx.admin)
    res = client.patch(f"{API}/admin/support/tickets/{tid}", json={"status": "resolved", "severity": "high"}, headers=admin_h)
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "resolved" and body["resolved_at"] is not None and body["severity"] == "high"

    res = client.patch(f"{API}/admin/support/tickets/{tid}", json={"status": "triaged"}, headers=admin_h)
    assert res.json()["resolved_at"] is None
    kinds = [e["event_type"] for e in res.json()["events"]]
    assert kinds.count("status_changed") == 2 and "field_changed" in kinds


def test_admin_endpoints_require_superadmin(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
) -> None:
    tid = _create(client, auth_headers(ctx.user))["id"]
    h = auth_headers(ctx.user)  # colaborador
    assert client.get(f"{API}/admin/support/tickets", headers=h).status_code == 403
    assert client.get(f"{API}/admin/support/tickets/{tid}", headers=h).status_code == 403
    assert client.patch(f"{API}/admin/support/tickets/{tid}", json={"status": "resolved"}, headers=h).status_code == 403


def test_admin_list_filters(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
) -> None:
    a = _create(client, auth_headers(ctx.user), subject="Zzqx asunto único", category="question")
    _create(client, auth_headers(ctx.colleague), subject="Otro ticket distinto", category="bug")
    admin_h = auth_headers(ctx.admin)

    res = client.get(f"{API}/admin/support/tickets", params={"q": "Zzqx"}, headers=admin_h).json()
    assert [t["id"] for t in res["items"]] == [a["id"]]
    res = client.get(f"{API}/admin/support/tickets", params={"category": "question", "q": ctx.user.email}, headers=admin_h).json()
    assert [t["id"] for t in res["items"]] == [a["id"]]


# ─────────────────────────── Público ───────────────────────────


def test_public_ticket_has_no_org_and_no_user(
    client: TestClient, ctx: SimpleNamespace, auth_headers: Callable[[User], dict[str, str]],
    sent_emails: list[dict],  # type: ignore[type-arg]
) -> None:
    # Aun si el email coincide con un usuario real, NO se vincula (ADR-0015 punto 2).
    payload = _public_payload(email=ctx.user.email)
    res = _post_public(client, payload)
    assert res.status_code == 201 and res.json() == {"ok": True}  # type: ignore[attr-defined]
    row = _db_row("SELECT org_id, user_id, source, status FROM support_tickets WHERE reporter_email = :e AND source = 'public'", e=ctx.user.email)
    assert row["org_id"] is None and row["user_id"] is None
    assert row["source"] == "public" and row["status"] == "new"
    assert {e["template"] for e in sent_emails} == {"support_ack", "support_internal"}

    # El admin lo ve; el usuario real NO lo ve en "mis tickets".
    listing = client.get(f"{API}/admin/support/tickets", params={"q": ctx.user.email}, headers=auth_headers(ctx.admin)).json()
    assert listing["total"] == 1
    mine = client.get(f"{API}/me/support/tickets", headers=auth_headers(ctx.user)).json()
    assert mine["total"] == 0
    # limpieza (este email no usa el dominio de cleanup)
    s = SessionLocal()
    s.execute(text("DELETE FROM support_tickets WHERE org_id IS NULL AND reporter_email = :e"), {"e": ctx.user.email})
    s.commit()
    s.close()


def test_public_honeypot_is_not_stored(client: TestClient) -> None:
    payload = _public_payload(website="http://spam.example")
    res = _post_public(client, payload)
    assert res.status_code == 201  # type: ignore[attr-defined]
    assert _db_row("SELECT 1 AS x FROM support_tickets WHERE reporter_email = :e", e=payload["email"]) is None


def test_public_validation(client: TestClient) -> None:
    assert _post_public(client, _public_payload(email="no-es-email")).status_code == 422  # type: ignore[attr-defined]
    assert _post_public(client, _public_payload(body="x")).status_code == 422  # type: ignore[attr-defined]


def test_public_rate_limited_returns_429(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(rate_limit, "allow", lambda *a, **k: False)
    payload = _public_payload()
    res = _post_public(client, payload)
    assert res.status_code == 429  # type: ignore[attr-defined]
    assert _db_row("SELECT 1 AS x FROM support_tickets WHERE reporter_email = :e", e=payload["email"]) is None


def test_rate_limit_allow_counts_per_window() -> None:
    name = f"t-{uuid4().hex}"
    assert rate_limit.allow(name, "ident", limit=2, window_seconds=60) is True
    assert rate_limit.allow(name, "ident", limit=2, window_seconds=60) is True
    assert rate_limit.allow(name, "ident", limit=2, window_seconds=60) is False
    assert rate_limit.allow(name, "otro", limit=2, window_seconds=60) is True


def test_rate_limit_fails_open_when_redis_is_down(monkeypatch: pytest.MonkeyPatch) -> None:
    def _boom() -> None:
        raise ConnectionError("redis down")

    monkeypatch.setattr(rate_limit, "_redis", _boom)
    assert rate_limit.allow("x", "y", limit=0) is True


# ─────────────────────────── RLS ───────────────────────────


def _ticket(org_id, user_id=None, **over) -> SupportTicket:  # type: ignore[no-untyped-def]
    fields = {
        "code": f"T-{uuid4().hex[:10]}", "org_id": org_id, "user_id": user_id,
        "reporter_email": "r@rls.test", "subject": "Asunto", "body": "Detalle largo",
        "source": "app",
    }
    fields.update(over)
    return SupportTicket(**fields)


def _bootstrap(db: Session) -> tuple[Organization, Organization]:
    cos = [Company(name=f"Co {i}", slug=f"c-{uuid4().hex[:10]}") for i in range(2)]
    db.add_all(cos)
    db.flush()
    orgs = [Organization(name=f"Org {i}", slug=f"o-{uuid4().hex[:8]}", company_id=c.id) for i, c in enumerate(cos)]
    db.add_all(orgs)
    db.flush()
    return orgs[0], orgs[1]


def _set_org(db: Session, org_id) -> None:  # type: ignore[no-untyped-def]
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_id)})


def test_rls_isolates_tickets_and_hides_public_ones(db: Session) -> None:
    org_a, org_b = _bootstrap(db)
    t_a, t_b, t_pub = _ticket(org_a.id), _ticket(org_b.id), _ticket(None, source="public")
    db.add_all([t_a, t_b, t_pub])
    db.flush()
    db.add_all(
        SupportTicketEvent(ticket_id=t.id, org_id=t.org_id, event_type="created", actor_kind="user")
        for t in (t_a, t_b, t_pub)
    )
    db.flush()

    db.execute(text("SET LOCAL ROLE hg_app"))
    _set_org(db, org_a.id)
    assert db.execute(text("SELECT code FROM support_tickets")).scalars().all() == [t_a.code]
    assert db.execute(text("SELECT count(*) FROM support_ticket_events")).scalar_one() == 1

    _set_org(db, org_b.id)
    assert db.execute(text("SELECT code FROM support_tickets")).scalars().all() == [t_b.code]


def test_rls_blocks_writing_into_another_org_or_without_org(db: Session) -> None:
    org_a, org_b = _bootstrap(db)
    db.execute(text("SET LOCAL ROLE hg_app"))
    _set_org(db, org_a.id)
    insert = (
        "INSERT INTO support_tickets (id, code, org_id, reporter_email, subject, body, source) "
        "VALUES (gen_random_uuid(), :c, :o, 'x@x.test', 'Asunto', 'Detalle largo', 'app')"
    )
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(text(insert), {"c": f"T-{uuid4().hex[:10]}", "o": org_b.id})
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(text(insert), {"c": f"T-{uuid4().hex[:10]}", "o": None})


def test_events_are_append_only_for_the_app_role(db: Session) -> None:
    org_a, _ = _bootstrap(db)
    t = _ticket(org_a.id)
    db.add(t)
    db.flush()
    db.add(SupportTicketEvent(ticket_id=t.id, org_id=org_a.id, event_type="created", actor_kind="user"))
    db.flush()

    db.execute(text("SET LOCAL ROLE hg_app"))
    _set_org(db, org_a.id)
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(text("UPDATE support_ticket_events SET body = 'editado'"))
    with pytest.raises(DBAPIError), db.begin_nested():
        db.execute(text("DELETE FROM support_ticket_events"))
