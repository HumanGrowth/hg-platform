"""GET /api/v1/admin/org/widgets — adoption curve + onboarding funnel + monthly watch. B4-E."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import (
    CareerLevel,
    CareerPath,
    CourseProgress,
    Event,
    EventTrack,
)


def test_org_widgets_collaborator_403(client: TestClient, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    res = client.get("/api/v1/admin/org/widgets", headers=auth_headers(mw.r1))
    assert res.status_code == 403


def test_org_widgets_admin_sees_own_org(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin)
    res = client.get("/api/v1/admin/org/widgets", headers=auth_headers(admin))
    assert res.status_code == 200, res.text
    assert res.headers["cache-control"] == "private, max-age=60"


def test_org_widgets_adoption_curve_12_months(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin)
    body = client.get("/api/v1/admin/org/widgets", headers=auth_headers(admin)).json()
    assert len(body["adoption_curve"]) == 12
    assert len(body["monthly_watch"]) == 12
    months = [p["month"] for p in body["adoption_curve"]]
    assert months == sorted(months)  # oldest first


@pytest.fixture
def funnel_org(factory):
    """Org con funnel conocido: 3 invitados (1 aceptado), 1 user con login,
    1 user con curso, 1 user con completion."""
    s = factory.session
    if not s.scalar(select(CareerPath).where(CareerPath.code == "P1")):
        s.add(CareerPath(code="P1", name="Carrera e impacto", order_index=1))
        s.commit()
    path = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin, full_name="Funnel Admin")
    now = datetime.now(UTC)

    # 3 invitaciones, 1 aceptada
    for i in range(3):
        s.add(Invitation(
            org_id=org.id, email=f"inv{i}-{uuid4().hex[:6]}@hgtest.test",
            token_hash=uuid4().hex, expires_at=now + timedelta(days=7),
            accepted_at=now if i == 0 else None,
        ))
    s.commit()

    # admin tiene last_login_at -> cuenta para first_login
    admin.last_login_at = now
    s.commit()

    # user con curso en progreso + user con completion
    u_course = factory.make_user(org=org, full_name="Has Event")
    u_done = factory.make_user(org=org, full_name="Has Completion")
    created: list = []
    for u, completed in [(u_course, False), (u_done, True)]:
        c = Event(
            career_path_id=path.id, title="FC", slug=f"fc-{uuid4().hex[:10]}",
            order_index=0, career_level=CareerLevel.L1, track=EventTrack.competency,
            duration_seconds=600,
        )
        s.add(c)
        s.commit()
        created.append(c.id)
        s.add(CourseProgress(
            org_id=org.id, user_id=u.id, course_id=c.id, last_position_seconds=300,
            watch_pct=100.0 if completed else 40.0, is_completed=completed,
            first_played_at=now, last_played_at=now, completed_at=now if completed else None,
        ))
    s.commit()

    from types import SimpleNamespace
    yield SimpleNamespace(org=org, admin=admin)
    s.execute(delete(Event).where(Event.id.in_(created)))
    s.execute(delete(Invitation).where(Invitation.org_id == org.id))
    s.commit()


def test_org_widgets_funnel_classification(client, funnel_org, auth_headers) -> None:
    body = client.get("/api/v1/admin/org/widgets", headers=auth_headers(funnel_org.admin)).json()
    f = body["onboarding_funnel"]
    assert f["invited"] == 3
    assert f["accepted"] == 1
    assert f["first_login"] >= 1            # el admin tiene last_login_at
    assert f["first_course"] == 2           # u_course + u_done con progress
    assert f["first_completion"] == 1       # solo u_done completó


def test_org_widgets_superadmin_can_pass_org_id(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    res = client.get(
        "/api/v1/admin/org/widgets", headers=auth_headers(sa), params={"org_id": str(mw.org.id)}
    )
    assert res.status_code == 200, res.text
    assert len(res.json()["adoption_curve"]) == 12
