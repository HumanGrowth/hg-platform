"""Sistema de notificaciones (ADR-0018 · NT-01).

- ``/me/notification-preferences``: defaults, upsert, auditoría en ``consent_change_log``.
- ``NotificationGate``: estado de la empresa, preferencia, tope semanal, ``record``.
- Motor de recordatorios: respeta la compuerta (un aviso por semana, opt-out, empresa).
- Resumen semanal del líder: solo totales, mínimo de reportes, opt-out, una vez por semana.
- RLS: una persona de otra org no ve preferencias ajenas.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from hg.modules.consent.models import ConsentChangeLog
from hg.modules.identity.models import Company, Organization, User, UserRole
from hg.modules.learning_units.models import ModuleAssignment
from hg.modules.notifications import service
from hg.modules.notifications import tasks as engagement_tasks
from hg.modules.notifications.models import EngagementReminder, NotificationPreference
from hg.modules.notifications.service import NotificationGate

from ._lu_helpers import cleanup_units, make_unit, seed_attempt

API = "/api/v1"
NOW = datetime.now(UTC)


@pytest.fixture
def sent_emails(monkeypatch):
    """Captura cada ``send()`` (y lo da por entregado) sin tocar Resend."""
    calls: list[dict] = []

    def _send(**kwargs):
        calls.append(kwargs)
        return "sent"

    monkeypatch.setattr(engagement_tasks.email_service, "send", _send)
    return calls


def _remind(factory, user, kind: str, *, days_ago: float) -> None:
    factory.session.add(
        EngagementReminder(
            org_id=user.org_id, user_id=user.id, kind=kind,
            sent_at=NOW - timedelta(days=days_ago),
        )
    )
    factory.session.commit()


def _set_pref(factory, user, **kw) -> None:
    factory.session.add(NotificationPreference(org_id=user.org_id, user_id=user.id, **kw))
    factory.session.commit()


# ─────────────────────────── /me/notification-preferences ───────────────────────────


def test_preferences_default_is_pending(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org())
    res = client.get(f"{API}/me/notification-preferences", headers=auth_headers(user))
    assert res.status_code == 200
    body = res.json()
    assert body["learning_reminders"] is None
    assert body["leader_digest"] is None
    assert body["leader_digest_applicable"] is False


def test_leader_digest_applicable_only_for_managers(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org()
    manager = factory.make_user(org=org, role=UserRole.manager)
    res = client.get(f"{API}/me/notification-preferences", headers=auth_headers(manager))
    assert res.json()["leader_digest_applicable"] is True


def test_set_preferences_upserts_and_audits_only_changes(
    client: TestClient, factory, auth_headers
) -> None:
    user = factory.make_user(org=factory.make_org())
    headers = auth_headers(user)

    first = client.put(
        f"{API}/me/notification-preferences",
        headers=headers,
        json={"learning_reminders": False, "leader_digest": True},
    )
    assert first.status_code == 200
    assert first.json()["learning_reminders"] is False
    assert first.json()["leader_digest"] is True

    # Mismo valor otra vez: idempotente, no agrega filas al log.
    client.put(
        f"{API}/me/notification-preferences",
        headers=headers,
        json={"learning_reminders": False, "leader_digest": True},
    )
    # Cambia solo un scope: se registra únicamente ese.
    client.put(
        f"{API}/me/notification-preferences",
        headers=headers,
        json={"learning_reminders": True, "leader_digest": True},
    )

    logged = factory.session.scalars(
        select(ConsentChangeLog).where(ConsentChangeLog.user_id == user.id)
    ).all()
    # Las filas de una misma request comparten timestamp: se compara sin depender del orden.
    assert sorted((row.scope, row.value) for row in logged) == sorted(
        [
            (service.SCOPE_LEARNING, False),  # None → False
            (service.SCOPE_DIGEST, True),  # None → True
            (service.SCOPE_LEARNING, True),  # False → True (el 2.º PUT no cambió nada)
        ]
    )
    rows = factory.session.scalars(
        select(NotificationPreference).where(NotificationPreference.user_id == user.id)
    ).all()
    assert len(rows) == 1  # una sola fila por persona


def test_preferences_require_auth(client: TestClient) -> None:
    assert client.get(f"{API}/me/notification-preferences").status_code in (401, 403)


# ─────────────────────────── Compuerta ───────────────────────────


def test_gate_allows_pending_preference_and_active_company(factory) -> None:
    user = factory.make_user(org=factory.make_org())
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_7d") is None
    assert gate.check_leader_digest(user.id) is None


def test_gate_respects_opt_out(factory) -> None:
    user = factory.make_user(org=factory.make_org())
    _set_pref(factory, user, learning_reminders=False, leader_digest=True)
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_7d") == service.SKIP_OPTED_OUT
    assert gate.check_leader_digest(user.id) is None  # son independientes


@pytest.mark.parametrize("status", ["grace", "suspended", "terminated"])
def test_gate_blocks_companies_without_access(factory, status: str) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    company = factory.session.get(Company, org.company_id)
    company.status = status
    factory.session.commit()
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_7d") == service.SKIP_COMPANY_STATUS
    assert gate.check_leader_digest(user.id) == service.SKIP_COMPANY_STATUS


def test_gate_allows_trial_company(factory) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    company = factory.session.get(Company, org.company_id)
    company.status = "trial"
    factory.session.commit()
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_7d") is None


def test_gate_unknown_user_fails_closed(factory) -> None:
    gate = NotificationGate.build(factory.session, [])
    assert gate.check_learning(uuid4(), "inactivity_7d") == service.SKIP_COMPANY_STATUS
    assert gate.check_leader_digest(uuid4()) == service.SKIP_COMPANY_STATUS


def test_gate_weekly_cap_counts_every_learning_kind(factory) -> None:
    user = factory.make_user(org=factory.make_org())
    _remind(factory, user, "assignment_due_soon", days_ago=3)
    gate = NotificationGate.build(factory.session, [user.id])
    # Otro tipo de aviso, misma semana: también se frena.
    assert gate.check_learning(user.id, "inactivity_21d") == service.SKIP_WEEKLY_CAP


def test_gate_cap_lifts_after_seven_days(factory) -> None:
    user = factory.make_user(org=factory.make_org())
    _remind(factory, user, "inactivity_7d", days_ago=8)
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_21d") is None


def test_gate_cap_exempt_kinds(factory, monkeypatch) -> None:
    user = factory.make_user(org=factory.make_org())
    _remind(factory, user, "inactivity_7d", days_ago=1)
    monkeypatch.setattr(service, "CAP_EXEMPT_KINDS", frozenset({"assignment_due_today"}))
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "assignment_due_today") is None
    assert gate.check_learning(user.id, "assignment_due_soon") == service.SKIP_WEEKLY_CAP


def test_gate_record_blocks_second_notice_in_same_run(factory) -> None:
    user = factory.make_user(org=factory.make_org())
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_7d") is None
    gate.record(user.id, "inactivity_7d")
    assert gate.check_learning(user.id, "assignment_due_soon") == service.SKIP_WEEKLY_CAP


def test_gate_digest_and_learning_caps_are_independent(factory) -> None:
    user = factory.make_user(org=factory.make_org())
    _remind(factory, user, service.LEADER_DIGEST_KIND, days_ago=2)
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_leader_digest(user.id) == service.SKIP_DIGEST_RECENT
    assert gate.check_learning(user.id, "inactivity_7d") is None  # el resumen no cuenta

    _remind(factory, user, "inactivity_7d", days_ago=1)
    gate = NotificationGate.build(factory.session, [user.id])
    assert gate.check_learning(user.id, "inactivity_21d") == service.SKIP_WEEKLY_CAP


# ─────────────────────────── Motor de recordatorios ───────────────────────────


@pytest.fixture
def inactive_user(factory):
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator, full_name="Ana Vega")
    unit = make_unit(factory.session, dimension_code="CP")
    seed_attempt(
        factory.session, org_id=org.id, user_id=user.id, unit=unit,
        when=NOW - timedelta(days=10), completed=True,
    )
    yield org, user, unit
    cleanup_units(factory.session, [unit.id])


def _to(calls: list[dict], user: User) -> list[dict]:
    return [c for c in calls if c["to"] == user.email]


def test_inactivity_reminder_skipped_when_user_opted_out(factory, inactive_user, sent_emails):
    _, user, _ = inactive_user
    _set_pref(factory, user, learning_reminders=False)
    engagement_tasks._run_inactivity_reminders(factory.session)
    assert _to(sent_emails, user) == []


def test_inactivity_reminder_skipped_when_company_suspended(factory, inactive_user, sent_emails):
    org, user, _ = inactive_user
    company = factory.session.get(Company, org.company_id)
    company.status = "suspended"
    factory.session.commit()
    engagement_tasks._run_inactivity_reminders(factory.session)
    assert _to(sent_emails, user) == []


def test_reminder_context_links_to_preferences(factory, inactive_user, sent_emails):
    _, user, _ = inactive_user
    engagement_tasks._run_inactivity_reminders(factory.session)
    (call,) = _to(sent_emails, user)
    assert call["context"]["prefs_url"].endswith("/perfil/editar")


def test_templates_link_to_preferences() -> None:
    from hg.modules.notifications.email_service import email_service

    url = "https://app.test/perfil/editar"
    ctx = {"prefs_url": url, "headline": "h", "subtext": "s", "insight": "i",
           "cta_url": "https://app.test", "cta_label": "Ir", "first_name": "Ana"}
    html = email_service.render("engagement_reminder", ctx)
    assert url in html and "Gestioná tus avisos" in html


def test_one_notice_per_week_when_due_date_and_inactivity_both_apply(
    factory, inactive_user, sent_emails
):
    """Inactivo hace 10 días (aplica el de 7d) Y con un módulo que vence en 2 días: con la
    misma compuerta solo sale uno, y gana el que tiene fecha."""
    org, user, _ = inactive_user
    assigned = make_unit(factory.session, dimension_code="CP")
    factory.session.add(
        ModuleAssignment(
            org_id=org.id, user_id=user.id, learning_unit_id=assigned.id,
            due_date=NOW + timedelta(days=2),
        )
    )
    factory.session.commit()

    gate = NotificationGate.build(factory.session, [user.id])
    engagement_tasks._run_due_date_reminders(factory.session, gate)
    engagement_tasks._run_inactivity_reminders(factory.session, gate)

    mine = _to(sent_emails, user)
    assert len(mine) == 1
    kinds = factory.session.scalars(
        select(EngagementReminder.kind).where(EngagementReminder.user_id == user.id)
    ).all()
    assert kinds == ["assignment_due_soon"]
    cleanup_units(factory.session, [assigned.id])


def test_inactivity_reminder_waits_for_cap_then_sends(factory, inactive_user, sent_emails):
    _, user, _ = inactive_user
    _remind(factory, user, "assignment_due_soon", days_ago=2)
    engagement_tasks._run_inactivity_reminders(factory.session)
    assert _to(sent_emails, user) == []

    # Pasada la semana, el aviso sale (no se marcó como enviado mientras estuvo frenado).
    factory.session.execute(
        text("UPDATE engagement_reminders SET sent_at = :ts WHERE user_id = :uid"),
        {"ts": NOW - timedelta(days=8), "uid": user.id},
    )
    factory.session.commit()
    engagement_tasks._run_inactivity_reminders(factory.session)
    assert len(_to(sent_emails, user)) == 1


# ─────────────────────────── Resumen semanal del líder ───────────────────────────


def test_leader_digest_sends_totals_only(factory, manager_with_reports, sent_emails):
    team = manager_with_reports
    engagement_tasks._run_leader_digests(factory.session)

    (call,) = _to(sent_emails, team.manager)
    assert call["template"] == "leader_weekly_digest"
    ctx = call["context"]
    # r1 tuvo actividad; r2 (25 días) y r3 (nunca) no.
    assert ctx["headline"] == "1 de 3 personas de tu equipo tuvieron actividad esta semana"
    assert ctx["inactive_line"] == "2 personas llevan más de 21 días sin actividad."
    # Nada individual: ni nombres ni correos de los reportes en el contexto.
    flat = str(ctx)
    for person in (team.r1, team.r2, team.r3):
        assert person.full_name not in flat
        assert person.email not in flat


def test_leader_digest_goes_once_per_week(factory, manager_with_reports, sent_emails):
    team = manager_with_reports
    engagement_tasks._run_leader_digests(factory.session)
    engagement_tasks._run_leader_digests(factory.session)
    assert len(_to(sent_emails, team.manager)) == 1


def test_leader_digest_respects_opt_out(factory, manager_with_reports, sent_emails):
    team = manager_with_reports
    _set_pref(factory, team.manager, leader_digest=False)
    engagement_tasks._run_leader_digests(factory.session)
    assert _to(sent_emails, team.manager) == []


def test_leader_digest_skipped_for_small_teams(factory, sent_emails):
    org = factory.make_org()
    manager = factory.make_user(org=org, role=UserRole.manager)
    for _ in range(service.DIGEST_MIN_TEAM_SIZE - 1):
        factory.make_user(org=org, manager_id=manager.id)
    engagement_tasks._run_leader_digests(factory.session)
    assert _to(sent_emails, manager) == []


def test_leader_digest_skipped_when_company_suspended(factory, manager_with_reports, sent_emails):
    team = manager_with_reports
    company = factory.session.get(Company, team.org.company_id)
    company.status = "suspended"
    factory.session.commit()
    engagement_tasks._run_leader_digests(factory.session)
    assert _to(sent_emails, team.manager) == []


# ─────────────────────────── RLS ───────────────────────────


def test_preferences_isolated_by_org(db: Session) -> None:
    """Como ``hg_app`` con contexto de la org A, la preferencia de la org B no se ve."""
    users = []
    for tag in ("a", "b"):
        company = Company(name=f"Co {tag}", slug=f"c-{uuid4().hex[:10]}")
        db.add(company)
        db.flush()
        org = Organization(name=f"Org {tag}", slug=f"o-{uuid4().hex[:10]}", company_id=company.id)
        db.add(org)
        db.flush()
        user = User(
            org_id=org.id, company_id=company.id, email=f"{tag}-{uuid4().hex[:8]}@hgtest.test",
            hashed_password="h" * 10, full_name=tag,
        )
        db.add(user)
        db.flush()
        db.add(NotificationPreference(org_id=org.id, user_id=user.id, learning_reminders=False))
        db.flush()
        users.append(user)
    user_a, user_b = users

    db.execute(text("SET LOCAL ROLE hg_app"))
    db.execute(
        text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(user_a.org_id)}
    )
    visible = db.execute(text("SELECT user_id FROM notification_preferences")).scalars().all()
    assert visible == [user_a.id]
    assert user_b.id not in visible
