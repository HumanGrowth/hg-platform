"""GET /api/v1/me/widgets — streak heatmap (90d) + weekly (12w). B4-E.

La actividad se mide en **bloques completados** por período (no minutos de
video): cada bloque completado cuenta 1 en la celda de su día/semana.
"""
from __future__ import annotations

from datetime import UTC, datetime

import pytest
from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


@pytest.fixture
def widget_env(factory):
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator, full_name="Widget User")
    unit_ids: list = []

    def add_activity(*, when: datetime, blocks: int) -> None:
        """Registra ``blocks`` bloques completados fechados en ``when``."""
        u = make_unit(s, dimension_code="CP", n_blocks=blocks)
        unit_ids.append(u.id)
        seed_attempt(
            s, org_id=org.id, user_id=user.id, unit=u, when=when, completed_blocks=blocks
        )

    from types import SimpleNamespace
    yield SimpleNamespace(s=s, org=org, user=user, add_activity=add_activity)

    cleanup_units(s, unit_ids)


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
    # 3 bloques completados hoy.
    widget_env.add_activity(when=now, blocks=3)
    body = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user)).json()
    today_iso = now.date().isoformat()
    today_cell = next(d for d in body["streak"] if d["date"] == today_iso)
    assert today_cell["minutes"] == 3
    assert today_cell["has_activity"] is True
    other = sum(d["minutes"] for d in body["streak"] if d["date"] != today_iso)
    assert other == 0


def test_me_widgets_weekly_returns_12_weeks(client, widget_env, auth_headers) -> None:
    now = datetime.now(UTC)
    widget_env.add_activity(when=now, blocks=2)  # 2 bloques esta semana
    body = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user)).json()
    assert len(body["weekly_minutes"]) == 12
    assert body["weekly_minutes"][-1]["minutes"] == 2  # semana actual es la última
    starts = [w["week_start"] for w in body["weekly_minutes"]]
    assert starts == sorted(starts)


def test_me_widgets_cache_header(client, widget_env, auth_headers) -> None:
    res = client.get("/api/v1/me/widgets", headers=auth_headers(widget_env.user))
    assert res.headers["cache-control"] == "private, max-age=60"
