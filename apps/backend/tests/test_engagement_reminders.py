"""Motor de recordatorios de engagement (inactividad + due dates)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import ModuleAssignment
from hg.modules.notifications import tasks as engagement_tasks
from hg.modules.notifications.models import EngagementReminder

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


@pytest.fixture
def _always_sends(monkeypatch):
    """Evita depender de `emails_enabled`/Resend real: cada `send()` cuenta
    como entregado, para poder probar el log de dedupe."""
    monkeypatch.setattr(
        engagement_tasks.email_service, "send", lambda **kwargs: "sent"
    )


@pytest.fixture
def inactive_user(factory):
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator, full_name="Ana Vega")
    unit = make_unit(factory.session, dimension_code="CP")
    yield org, user, unit
    cleanup_units(factory.session, [unit.id])


def test_sends_7d_reminder_and_does_not_duplicate_same_episode(
    factory, inactive_user, _always_sends
):
    org, user, unit = inactive_user
    seed_attempt(
        factory.session, org_id=org.id, user_id=user.id, unit=unit,
        when=datetime.now(UTC) - timedelta(days=8), completed=True,
    )
    factory.session.commit()

    sent = engagement_tasks._run_inactivity_reminders(factory.session)
    assert sent == 1
    rows = factory.session.scalars(
        select(EngagementReminder).where(EngagementReminder.user_id == user.id)
    ).all()
    assert [r.kind for r in rows] == ["inactivity_7d"]

    # Correr de nuevo el mismo día (mismo episodio) no debe volver a mandar.
    sent_again = engagement_tasks._run_inactivity_reminders(factory.session)
    assert sent_again == 0


def test_sends_21d_reminder_not_7d_when_both_thresholds_apply(
    factory, inactive_user, _always_sends
):
    org, user, unit = inactive_user
    seed_attempt(
        factory.session, org_id=org.id, user_id=user.id, unit=unit,
        when=datetime.now(UTC) - timedelta(days=30), completed=True,
    )
    factory.session.commit()

    sent = engagement_tasks._run_inactivity_reminders(factory.session)
    assert sent == 1
    kinds = [
        r.kind for r in factory.session.scalars(
            select(EngagementReminder).where(EngagementReminder.user_id == user.id)
        ).all()
    ]
    assert kinds == ["inactivity_21d"]


def test_no_reminder_for_recently_active_user(factory, inactive_user, _always_sends):
    org, user, unit = inactive_user
    seed_attempt(
        factory.session, org_id=org.id, user_id=user.id, unit=unit,
        when=datetime.now(UTC) - timedelta(days=2), completed=True,
    )
    factory.session.commit()
    assert engagement_tasks._run_inactivity_reminders(factory.session) == 0


def test_due_date_reminders_fire_in_window_and_dedupe(factory, inactive_user, _always_sends):
    org, user, unit = inactive_user
    now = datetime.now(UTC)

    due_soon = ModuleAssignment(
        org_id=org.id, user_id=user.id, learning_unit_id=unit.id,
        due_date=now + timedelta(days=2),
    )
    factory.session.add(due_soon)
    factory.session.commit()

    sent = engagement_tasks._run_due_date_reminders(factory.session)
    assert sent == 1
    row = factory.session.scalar(
        select(EngagementReminder).where(EngagementReminder.reference_id == due_soon.id)
    )
    assert row is not None
    assert row.kind == "assignment_due_soon"

    # Correr de nuevo el mismo día no duplica el aviso de esa asignación.
    assert engagement_tasks._run_due_date_reminders(factory.session) == 0


def test_due_date_reminder_skips_far_future_and_completed(factory, inactive_user, _always_sends):
    org, user, unit = inactive_user
    now = datetime.now(UTC)

    far = ModuleAssignment(
        org_id=org.id, user_id=user.id, learning_unit_id=unit.id,
        due_date=now + timedelta(days=10),
    )
    unit2 = make_unit(factory.session, dimension_code="CP")
    done = ModuleAssignment(
        org_id=org.id, user_id=user.id, learning_unit_id=unit2.id,
        due_date=now, status="completed",
    )
    factory.session.add_all([far, done])
    factory.session.commit()

    assert engagement_tasks._run_due_date_reminders(factory.session) == 0
    cleanup_units(factory.session, [unit2.id])
