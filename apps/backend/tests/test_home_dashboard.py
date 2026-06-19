"""GET /api/v1/me/home — dashboard agregado del colaborador (B3-04).

Solo devuelve la data del usuario autenticado (RLS); las agregaciones se
calculan on-demand sobre course_progress (ADR-0009).
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from hg.modules.identity.models import UserRole
from hg.modules.learning.models import (
    CareerLevel,
    CareerPath,
    Course,
    CourseProgress,
    CourseTrack,
    Enrollment,
)

_PATHS = [
    ("P1", "Carrera e impacto", 1), ("P2", "Propósito y significado", 2),
    ("P3", "Relaciones y conexión", 3), ("P4", "Salud y bienestar", 4),
    ("P5", "Paz interior y claridad", 5), ("P6", "Estabilidad emocional y material", 6),
]


def _ensure_paths(s) -> None:
    for code, name, order in _PATHS:
        if not s.scalar(select(CareerPath).where(CareerPath.code == code)):
            s.add(CareerPath(code=code, name=name, order_index=order))
    s.commit()


def _make_course(s, path_code: str, *, duration: int = 300) -> Course:
    path = s.scalar(select(CareerPath).where(CareerPath.code == path_code))
    c = Course(
        career_path_id=path.id, title=f"Home Course {path_code}", slug=f"hc-{uuid4().hex[:10]}",
        order_index=0, career_level=CareerLevel.L1, track=CourseTrack.competency,
        duration_seconds=duration,
    )
    s.add(c)
    s.commit()
    return c


def _progress(s, *, org_id, user_id, course, watch_pct, completed, last_played, pos=150):
    s.add(CourseProgress(
        org_id=org_id, user_id=user_id, course_id=course.id, last_position_seconds=pos,
        watch_pct=watch_pct, is_completed=completed,
        first_played_at=last_played, last_played_at=last_played,
        completed_at=last_played if completed else None,
    ))
    s.commit()


@pytest.fixture
def home_env(factory):
    """Org + user colaborador con catálogo P1..P6 asegurado. Limpia los courses
    creados (su progress cae por CASCADE); la org cae por el teardown de factory."""
    s = factory.session
    _ensure_paths(s)
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator, full_name="Home User")
    created: list = []

    def course(path_code="P1", **kw):
        c = _make_course(s, path_code, **kw)
        created.append(c.id)
        return c

    from types import SimpleNamespace
    yield SimpleNamespace(s=s, org=org, user=user, course=course, factory=factory)

    from sqlalchemy import delete
    s.execute(delete(Course).where(Course.id.in_(created)))
    s.commit()


def test_home_requires_auth(client: TestClient) -> None:
    res = client.get("/api/v1/me/home")
    assert res.status_code == 401


def test_home_empty_user_returns_defaults(client, home_env, auth_headers) -> None:
    res = client.get("/api/v1/me/home", headers=auth_headers(home_env.user))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["next_step"] is None
    assert body["active_enrollments"] == []
    assert body["recent_activity"] == []
    assert set(body["pillar_completion_rates"]) == {"P1", "P2", "P3", "P4", "P5", "P6"}
    assert all(v == 0.0 for v in body["pillar_completion_rates"].values())
    stats = body["stats"]
    assert stats["courses_in_progress"] == 0
    assert stats["courses_completed"] == 0
    assert stats["total_watch_minutes"] == 0
    assert stats["month_watch_minutes"] == 0
    assert stats["streak_days"] == 0


def test_home_next_step_is_most_recent_in_progress(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    older = e.course()
    recent = e.course()
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=older,
              watch_pct=20.0, completed=False, last_played=now - timedelta(days=2))
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=recent,
              watch_pct=40.0, completed=False, last_played=now - timedelta(hours=1))
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    assert body["next_step"]["course_id"] == str(recent.id)
    assert body["next_step"]["pillar_code"] == "P1"
    assert body["next_step"]["watch_pct"] == 40.0


def test_home_next_step_excludes_completed_and_near_finished(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    done = e.course()
    almost = e.course()
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=done,
              watch_pct=100.0, completed=True, last_played=now)
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=almost,
              watch_pct=85.0, completed=False, last_played=now)
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    # Completado y ≥80% no califican como próximo paso.
    assert body["next_step"] is None


def test_home_recent_activity_limited_to_5_desc(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    for i in range(7):
        c = e.course()
        _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=c,
                  watch_pct=10.0 * i, completed=False, last_played=now - timedelta(hours=i))
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    activity = body["recent_activity"]
    assert len(activity) == 5
    times = [a["last_played_at"] for a in activity]
    assert times == sorted(times, reverse=True)


def test_home_stats_counts(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    for _ in range(2):
        _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=e.course(),
                  watch_pct=100.0, completed=True, last_played=now, pos=300)
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=e.course(),
              watch_pct=30.0, completed=False, last_played=now, pos=300)
    stats = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()["stats"]
    assert stats["courses_completed"] == 2
    assert stats["courses_in_progress"] == 1
    assert stats["total_watch_minutes"] == 15  # 3 * 300s = 900s = 15min


def test_home_month_watch_minutes_excludes_old(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=e.course(),
              watch_pct=50.0, completed=False, last_played=now, pos=600)
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=e.course(),
              watch_pct=50.0, completed=False, last_played=now - timedelta(days=60), pos=600)
    stats = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()["stats"]
    assert stats["total_watch_minutes"] == 20  # 1200s
    assert stats["month_watch_minutes"] == 10  # solo el de este mes (600s)


def test_home_streak_counts_consecutive_days(client, home_env, auth_headers) -> None:
    e = home_env
    today = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0)
    for d in range(3):  # hoy, ayer, anteayer
        _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=e.course(),
                  watch_pct=20.0, completed=False, last_played=today - timedelta(days=d))
    # Hueco: nada hace 4 días -> no extiende la racha.
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=e.course(),
              watch_pct=20.0, completed=False, last_played=today - timedelta(days=5))
    stats = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()["stats"]
    assert stats["streak_days"] == 3


def test_home_active_enrollments_only(client, home_env, auth_headers) -> None:
    e = home_env
    s = e.s
    p1 = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
    p2 = s.scalar(select(CareerPath).where(CareerPath.code == "P2"))
    s.add(Enrollment(org_id=e.org.id, user_id=e.user.id, career_path_id=p1.id,
                     source="manual", is_active=True))
    s.add(Enrollment(org_id=e.org.id, user_id=e.user.id, career_path_id=p2.id,
                     source="manual", is_active=False))
    s.commit()
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    codes = {en["career_path_code"] for en in body["active_enrollments"]}
    assert codes == {"P1"}


def test_home_only_returns_own_data(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    other = e.factory.make_user(org=e.org, role=UserRole.collaborator, full_name="Other User")
    mine = e.course()
    theirs = e.course()
    _progress(e.s, org_id=e.org.id, user_id=e.user.id, course=mine,
              watch_pct=30.0, completed=False, last_played=now)
    _progress(e.s, org_id=e.org.id, user_id=other.id, course=theirs,
              watch_pct=100.0, completed=True, last_played=now)
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    course_ids = {a["course_id"] for a in body["recent_activity"]}
    assert str(mine.id) in course_ids
    assert str(theirs.id) not in course_ids
    assert body["stats"]["courses_completed"] == 0  # el completado es del otro usuario
