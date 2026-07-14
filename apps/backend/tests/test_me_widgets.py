"""GET /api/v1/me/widgets — streak heatmap (90d) + weekly minutes (12w). B4-E."""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.modules.identity.models import UserRole
from hg.modules.learning.models import (
    CareerLevel,
    CareerPath,
    CourseProgress,
    Event,
    EventTrack,
)


@pytest.fixture
def widget_env(factory):
    s = factory.session
    if not s.scalar(select(CareerPath).where(CareerPath.code == "P1")):
        s.add(CareerPath(code="P1", name="Carrera e impacto", order_index=1))
        s.commit()
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator, full_name="Widget User")
    created: list = []

    def add_progress(*, when: datetime, seconds: int) -> None:
        path = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
        c = Event(
            career_path_id=path.id, title="WC", slug=f"wc-{uuid4().hex[:10]}",
            order_index=0, career_level=CareerLevel.L1, track=EventTrack.competency,
            duration_seconds=600,
        )
        s.add(c)
        s.commit()
        created.append(c.id)
        s.add(CourseProgress(
            org_id=org.id, user_id=user.id, course_id=c.id, last_position_seconds=seconds,
            watch_pct=50.0, is_completed=False, first_played_at=when, last_played_at=when,
        ))
        s.commit()

    from types import SimpleNamespace
    yield SimpleNamespace(s=s, org=org, user=user, add_progress=add_progress)

    s.execute(delete(Event).where(Event.id.in_(created)))
    s.commit()


def test_me_widgets_unauth(client: TestClient) -> None:
    assert client.get("/api/v1/me/widgets").status_code == 401


def test_me_widgets_empty_user_returns_90_days_of_zeros(client, widget_env, auth_headers) -> None:
    body = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user)).json()
    assert len(body["streak"]) == 90
    assert all(d["minutes"] == 0 and d["has_activity"] is False for d in body["streak"])
    # oldest first: las fechas son estrictamente crecientes
    dates = [d["date"] for d in body["streak"]]
    assert dates == sorted(dates)


def test_me_widgets_streak_buckets_by_day(client, widget_env, auth_headers) -> None:
    now = datetime.now(UTC)
    # 3 eventos hoy (3 cursos distintos), 600s c/u = 1800s = 30 min en el día de hoy.
    for _ in range(3):
        widget_env.add_progress(when=now, seconds=600)
    body = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user)).json()
    today_iso = now.date().isoformat()
    today_cell = next(d for d in body["streak"] if d["date"] == today_iso)
    assert today_cell["minutes"] == 30
    assert today_cell["has_activity"] is True
    other = sum(d["minutes"] for d in body["streak"] if d["date"] != today_iso)
    assert other == 0


def test_me_widgets_weekly_returns_12_weeks(client, widget_env, auth_headers) -> None:
    now = datetime.now(UTC)
    widget_env.add_progress(when=now, seconds=1200)  # 20 min esta semana
    body = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user)).json()
    assert len(body["weekly_minutes"]) == 12
    assert body["weekly_minutes"][-1]["minutes"] == 20  # semana actual es la última
    starts = [w["week_start"] for w in body["weekly_minutes"]]
    assert starts == sorted(starts)


def test_me_widgets_cache_header(client, widget_env, auth_headers) -> None:
    res = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user))
    assert res.headers["cache-control"] == "private, max-age=60"
