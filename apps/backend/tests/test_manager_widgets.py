"""GET /api/v1/manager/me/widgets — team activity + inactivity buckets. B4-E."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.modules.identity.models import UserRole
from hg.modules.learning.models import (
    CareerLevel,
    CareerPath,
    Course,
    CourseProgress,
    CourseTrack,
)


@pytest.fixture
def manager_buckets(factory):
    """Manager con 6 reportes, uno por bucket de inactividad."""
    s = factory.session
    if not s.scalar(select(CareerPath).where(CareerPath.code == "P1")):
        s.add(CareerPath(code="P1", name="Carrera e impacto", order_index=1))
        s.commit()
    path = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager, full_name="Bucket Mgr")
    now = datetime.now(UTC)
    created: list = []

    def report(name: str, gap_days: int | None):
        u = factory.make_user(org=org, manager_id=mgr.id, full_name=name)
        if gap_days is not None:
            c = Course(
                career_path_id=path.id, title="BC", slug=f"bc-{uuid4().hex[:10]}",
                order_index=0, career_level=CareerLevel.L1, track=CourseTrack.competency,
                duration_seconds=600,
            )
            s.add(c)
            s.commit()
            created.append(c.id)
            when = now - timedelta(days=gap_days)
            s.add(CourseProgress(
                org_id=org.id, user_id=u.id, course_id=c.id, last_position_seconds=300,
                watch_pct=50.0, is_completed=False, first_played_at=when, last_played_at=when,
            ))
            s.commit()
        return u

    r_active = report("R Active", 0)
    r_1_7 = report("R 1-7", 5)
    r_8_14 = report("R 8-14", 10)
    r_15_30 = report("R 15-30", 20)
    r_gt30 = report("R gt30", 40)
    r_never = report("R Never", None)

    from types import SimpleNamespace
    yield SimpleNamespace(
        org=org, mgr=mgr,
        ids={r_active.id, r_1_7.id, r_8_14.id, r_15_30.id, r_gt30.id, r_never.id},
    )
    s.execute(delete(Course).where(Course.id.in_(created)))
    s.commit()


def test_manager_widgets_only_direct_reports(client: TestClient, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    body = client.get("/api/v1/manager/me/widgets", headers=auth_headers(mw.manager)).json()
    report_ids = {str(mw.r1.id), str(mw.r2.id), str(mw.r3.id)}
    cell_ids = {c["user_id"] for c in body["team_activity"]}
    assert cell_ids.issubset(report_ids)
    assert str(mw.manager.id) not in cell_ids


def test_manager_widgets_inactivity_buckets_classification(client, manager_buckets, auth_headers) -> None:
    body = client.get(
        "/api/v1/manager/me/widgets", headers=auth_headers(manager_buckets.mgr)
    ).json()
    b = body["inactivity_buckets"]
    assert b["active"] == 1
    assert b["inactive_1_7d"] == 1
    assert b["inactive_8_14d"] == 1
    assert b["inactive_15_30d"] == 1
    assert b["inactive_gt_30d"] == 1
    assert b["never_active"] == 1


def test_manager_widgets_admin_sees_all_managers_of_org(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin, full_name="Org Admin")
    body = client.get("/api/v1/manager/me/widgets", headers=auth_headers(admin)).json()
    b = body["inactivity_buckets"]
    total = sum(b.values())
    # admin ve toda la org como equipo extendido: manager + r1 + r2 + r3 (>= 4)
    assert total >= 4
    cell_ids = {c["user_id"] for c in body["team_activity"]}
    assert str(mw.r1.id) in cell_ids  # r1 tuvo actividad reciente


def test_manager_widgets_collaborator_empty(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    loner = factory.make_user(org=mw.org, role=UserRole.collaborator, full_name="Loner")
    body = client.get("/api/v1/manager/me/widgets", headers=auth_headers(loner)).json()
    assert body["team_activity"] == []
    assert sum(body["inactivity_buckets"].values()) == 0
