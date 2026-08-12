"""GET /api/v1/me/home — dashboard agregado del colaborador (B3-04).

Solo devuelve la data del usuario autenticado (RLS); las agregaciones se
calculan on-demand sobre el modelo nuevo (learning_unit_attempts +
block_progress). La actividad se mide en **bloques completados** (ADR-0009).
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath, Enrollment

from ._lu_helpers import cleanup_units, make_unit, seed_attempt

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


@pytest.fixture
def home_env(factory):
    """Org + user colaborador con catálogo P1..P6 asegurado. Limpia las units
    creadas (attempts/block_progress caen por CASCADE)."""
    s = factory.session
    _ensure_paths(s)
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator, full_name="Home User")
    unit_ids: list = []

    def unit(*, dimension_code="CP", n_blocks=1, **kw):
        u = make_unit(s, dimension_code=dimension_code, n_blocks=n_blocks, **kw)
        unit_ids.append(u.id)
        return u

    def activity(u, *, when, user_id=None, completed=False, completed_blocks=None):
        return seed_attempt(
            s, org_id=org.id, user_id=user_id or user.id, unit=u,
            when=when, completed=completed, completed_blocks=completed_blocks,
        )

    from types import SimpleNamespace
    yield SimpleNamespace(s=s, org=org, user=user, unit=unit, activity=activity, factory=factory)

    cleanup_units(s, unit_ids)


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
    assert set(body["dimension_completion_rates"]) == {"P1", "P2", "P3", "P4", "P5", "P6"}
    assert all(v == 0.0 for v in body["dimension_completion_rates"].values())
    stats = body["stats"]
    assert stats["courses_in_progress"] == 0
    assert stats["courses_completed"] == 0
    assert stats["total_watch_minutes"] == 0
    assert stats["month_watch_minutes"] == 0
    assert stats["streak_days"] == 0


def test_home_next_step_is_most_recent_in_progress(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    older = e.unit(n_blocks=5)
    recent = e.unit(n_blocks=5)
    e.activity(older, when=now - timedelta(days=2), completed_blocks=1)  # 20%
    e.activity(recent, when=now - timedelta(hours=1), completed_blocks=2)  # 40%
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    assert body["next_step"]["course_id"] == str(recent.id)
    assert body["next_step"]["dimension_code"] == "P1"
    assert body["next_step"]["watch_pct"] == 40.0


def test_home_next_step_excludes_completed_and_near_finished(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    done = e.unit(n_blocks=1)
    almost = e.unit(n_blocks=5)
    e.activity(done, when=now, completed=True)
    e.activity(almost, when=now, completed_blocks=4)  # 80% → no califica
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    assert body["next_step"] is None


def test_home_recent_activity_limited_to_5_desc(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    for i in range(7):
        e.activity(e.unit(), when=now - timedelta(hours=i), completed_blocks=1)
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    activity = body["recent_activity"]
    assert len(activity) == 5
    times = [a["last_played_at"] for a in activity]
    assert times == sorted(times, reverse=True)


def test_home_stats_counts(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    for _ in range(2):
        e.activity(e.unit(), when=now, completed=True)  # 2 units completadas (1 bloque c/u)
    e.activity(e.unit(), when=now, completed_blocks=1)  # 1 en progreso (1 bloque)
    stats = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()["stats"]
    assert stats["courses_completed"] == 2
    assert stats["courses_in_progress"] == 1
    assert stats["total_watch_minutes"] == 3  # 3 bloques completados en total


def test_home_month_watch_minutes_excludes_old(client, home_env, auth_headers) -> None:
    e = home_env
    now = datetime.now(UTC)
    e.activity(e.unit(), when=now, completed_blocks=1)  # este mes
    e.activity(e.unit(), when=now - timedelta(days=60), completed_blocks=1)  # viejo
    stats = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()["stats"]
    assert stats["total_watch_minutes"] == 2  # 2 bloques all-time
    assert stats["month_watch_minutes"] == 1  # solo el de este mes


def test_home_streak_counts_consecutive_days(client, home_env, auth_headers) -> None:
    e = home_env
    today = datetime.now(UTC).replace(hour=12, minute=0, second=0, microsecond=0)
    for d in range(3):  # hoy, ayer, anteayer
        e.activity(e.unit(), when=today - timedelta(days=d), completed_blocks=1)
    # Hueco: nada hace 4 días -> no extiende la racha.
    e.activity(e.unit(), when=today - timedelta(days=5), completed_blocks=1)
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
    mine = e.unit()
    theirs = e.unit()
    e.activity(mine, when=now, completed_blocks=1)
    e.activity(theirs, when=now, user_id=other.id, completed=True)
    body = client.get("/api/v1/me/home", headers=auth_headers(e.user)).json()
    course_ids = {a["course_id"] for a in body["recent_activity"]}
    assert str(mine.id) in course_ids
    assert str(theirs.id) not in course_ids
    assert body["stats"]["courses_completed"] == 0  # el completado es del otro usuario
