"""Catalog endpoints (B2-06): paths + events with filters + auth."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import (
    CareerLevel,
    CareerPath,
    CompetencyCode,
    Event,
    EventTrack,
    EventType,
)

PATHS = [
    ("P1", "Carrera e impacto", 1),
    ("P2", "Propósito y significado", 2),
    ("P3", "Relaciones y conexión", 3),
    ("P4", "Salud y bienestar", 4),
    ("P5", "Paz interior y claridad", 5),
    ("P6", "Estabilidad emocional y material", 6),
]


def _ensure_paths() -> uuid.UUID:
    """Get-or-create los 6 CareerPath; devuelve el id de P1."""
    s = SessionLocal()
    try:
        for code, name, order in PATHS:
            if not s.scalar(select(CareerPath).where(CareerPath.code == code)):
                s.add(CareerPath(code=code, name=name, order_index=order))
        s.commit()
        return s.scalar(select(CareerPath.id).where(CareerPath.code == "P1"))
    finally:
        s.close()


def _make_event(
    *, path_id: uuid.UUID, slug: str, level: CareerLevel,
    competency: CompetencyCode | None, track: EventTrack,
    event_type: EventType = EventType.recorded_webinar,
) -> None:
    s = SessionLocal()
    try:
        s.add(Event(
            career_path_id=path_id, title=slug, slug=slug, order_index=1,
            career_level=level, competency_code=competency, track=track,
            event_type=event_type,
        ))
        s.commit()
    finally:
        s.close()


def _cleanup(slugs: list[str]) -> None:
    s = SessionLocal()
    s.execute(delete(Event).where(Event.slug.in_(slugs)))
    s.commit()
    s.close()


def _auth(factory, auth_headers):
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    return auth_headers(user)


# ─────────────────────────── paths ───────────────────────────


def test_list_paths_returns_six_ordered(client: TestClient, factory, auth_headers) -> None:
    _ensure_paths()
    res = client.get("/api/v1/paths", headers=_auth(factory, auth_headers))
    assert res.status_code == 200, res.text
    body = res.json()
    assert len(body) == 6
    orders = [p["order_index"] for p in body]
    assert orders == sorted(orders)
    assert body[0]["code"] == "P1"


def test_get_path_by_code(client: TestClient, factory, auth_headers) -> None:
    _ensure_paths()
    res = client.get("/api/v1/paths/P1", headers=_auth(factory, auth_headers))
    assert res.status_code == 200, res.text
    assert res.json()["code"] == "P1"


def test_get_path_unknown_404(client: TestClient, factory, auth_headers) -> None:
    res = client.get("/api/v1/paths/P9", headers=_auth(factory, auth_headers))
    assert res.status_code == 404


# ─────────────────────────── events filters ───────────────────────────


def test_courses_filter_level_and_competency(client: TestClient, factory, auth_headers) -> None:
    p1 = _ensure_paths()
    slug = "test-cat-l1-c1"
    other = "test-cat-l2-c2"
    try:
        _make_event(path_id=p1, slug=slug, level=CareerLevel.L1,
                     competency=CompetencyCode.C1, track=EventTrack.competency)
        _make_event(path_id=p1, slug=other, level=CareerLevel.L2,
                     competency=CompetencyCode.C2, track=EventTrack.competency)
        res = client.get(
            "/api/v1/events",
            headers=_auth(factory, auth_headers),
            params={"level": "L1", "competency": "C1", "limit": 100},
        )
        assert res.status_code == 200, res.text
        slugs = {c["slug"] for c in res.json()["items"]}
        assert slug in slugs
        assert other not in slugs
    finally:
        _cleanup([slug, other])


def test_courses_filter_track_foundation(client: TestClient, factory, auth_headers) -> None:
    p1 = _ensure_paths()
    fnd = "test-cat-fnd-ai"
    comp = "test-cat-comp"
    try:
        _make_event(path_id=p1, slug=fnd, level=CareerLevel.L1,
                     competency=None, track=EventTrack.foundation_ai)
        _make_event(path_id=p1, slug=comp, level=CareerLevel.L1,
                     competency=CompetencyCode.C1, track=EventTrack.competency)
        res = client.get(
            "/api/v1/events",
            headers=_auth(factory, auth_headers),
            params={"track": "foundation_ai", "limit": 100},
        )
        assert res.status_code == 200, res.text
        slugs = {c["slug"] for c in res.json()["items"]}
        assert fnd in slugs
        assert comp not in slugs
    finally:
        _cleanup([fnd, comp])


def test_courses_requires_auth(client: TestClient) -> None:
    res = client.get("/api/v1/events")
    assert res.status_code in (401, 403)


def test_events_filter_event_type(client: TestClient, factory, auth_headers) -> None:
    p1 = _ensure_paths()
    live = "test-cat-live"
    recorded = "test-cat-recorded"
    try:
        _make_event(path_id=p1, slug=live, level=CareerLevel.L1, competency=CompetencyCode.C1,
                    track=EventTrack.competency, event_type=EventType.live_webinar)
        _make_event(path_id=p1, slug=recorded, level=CareerLevel.L1, competency=CompetencyCode.C1,
                    track=EventTrack.competency, event_type=EventType.recorded_webinar)
        res = client.get(
            "/api/v1/events",
            headers=_auth(factory, auth_headers),
            params={"event_type": "live_webinar", "limit": 100},
        )
        assert res.status_code == 200, res.text
        slugs = {c["slug"] for c in res.json()["items"]}
        assert live in slugs
        assert recorded not in slugs
    finally:
        _cleanup([live, recorded])
