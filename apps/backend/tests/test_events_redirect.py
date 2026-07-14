"""Legacy /courses/* → /events/* 308 redirects (TASK A-08)."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerLevel, CareerPath, Event, EventTrack


def _p1_id() -> uuid.UUID:
    s = SessionLocal()
    try:
        p = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
        if p is None:
            p = CareerPath(code="P1", name="Carrera e impacto", order_index=1)
            s.add(p)
            s.commit()
        return p.id
    finally:
        s.close()


def _make_event(slug: str) -> None:
    s = SessionLocal()
    try:
        s.add(Event(
            career_path_id=_p1_id(), title=slug, slug=slug, order_index=1,
            career_level=CareerLevel.L1, track=EventTrack.competency, duration_seconds=300,
        ))
        s.commit()
    finally:
        s.close()


def _cleanup(slug: str) -> None:
    s = SessionLocal()
    s.execute(delete(Event).where(Event.slug == slug))
    s.commit()
    s.close()


def _auth(factory, auth_headers):
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    return auth_headers(user)


def test_list_courses_redirects_and_preserves_query(client: TestClient) -> None:
    r = client.get("/api/v1/courses?level=L1&limit=5", follow_redirects=False)
    assert r.status_code == 308
    assert r.headers["location"].endswith("/api/v1/events?level=L1&limit=5")


def test_paths_courses_redirects(client: TestClient) -> None:
    r = client.get("/api/v1/paths/P1/courses", follow_redirects=False)
    assert r.status_code == 308
    assert r.headers["location"].endswith("/api/v1/paths/P1/events")


def test_course_detail_redirects_and_resolves(client: TestClient, factory, auth_headers) -> None:
    slug = f"redirect-test-{uuid.uuid4().hex[:8]}"
    _make_event(slug)
    headers = _auth(factory, auth_headers)
    try:
        raw = client.get(f"/api/v1/courses/{slug}", headers=headers, follow_redirects=False)
        assert raw.status_code == 308
        assert raw.headers["location"].endswith(f"/api/v1/events/{slug}")

        followed = client.get(f"/api/v1/courses/{slug}", headers=headers)
        assert followed.status_code == 200
        assert followed.json()["slug"] == slug
    finally:
        _cleanup(slug)


def test_course_progress_post_redirect_preserves_method_and_body(
    client: TestClient, factory, auth_headers
) -> None:
    """308 (a diferencia de 301/302) preserva el método y el body — clave
    para que un cliente viejo posteando progress no lo pierda silenciosamente
    al seguir la redirección."""
    slug = f"redirect-test-{uuid.uuid4().hex[:8]}"
    _make_event(slug)
    headers = _auth(factory, auth_headers)
    try:
        r = client.post(
            f"/api/v1/courses/{slug}/progress", headers=headers,
            json={"position_seconds": 30, "watch_pct": 50.0},
        )
        assert r.status_code == 200
        assert r.json()["watch_pct"] == 50.0
    finally:
        _cleanup(slug)
