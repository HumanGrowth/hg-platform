"""Eventos de comunidad — CRUD admin + listado público (Sprint Tarde · TASK 5)."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerLevel, CareerPath, Event, EventTrack


def _admin_headers(factory, auth_headers):
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    return auth_headers(admin)


def _collab_headers(factory, auth_headers):
    return auth_headers(factory.make_user(org=factory.make_org(), role=UserRole.collaborator))


def _make_learning_event(slug: str) -> uuid.UUID:
    """Un Event de contenido de aprendizaje (CON career_path) — NO es comunidad."""
    s = SessionLocal()
    try:
        p = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
        if p is None:
            p = CareerPath(code="P1", name="Carrera e impacto", order_index=1)
            s.add(p)
            s.commit()
        ev = Event(
            career_path_id=p.id, title=slug, slug=slug, order_index=1,
            career_level=CareerLevel.L1, track=EventTrack.competency, duration_seconds=300,
        )
        s.add(ev)
        s.commit()
        return ev.id
    finally:
        s.close()


def _cleanup_event(event_id: uuid.UUID) -> None:
    s = SessionLocal()
    s.execute(delete(Event).where(Event.id == event_id))
    s.commit()
    s.close()


def _cleanup_slug(slug: str) -> None:
    s = SessionLocal()
    s.execute(delete(Event).where(Event.slug == slug))
    s.commit()
    s.close()


def test_admin_crud_and_public_listing(client: TestClient, factory, auth_headers) -> None:
    headers = _admin_headers(factory, auth_headers)
    created_id = None
    try:
        # create
        r = client.post(
            "/api/v1/admin/community-events", headers=headers,
            json={
                "type": "live_webinar", "title": "Webinar de Carrera",
                "description": "En vivo", "cta_url": "https://zoom.us/x",
                "cta_label": "Registrarme", "is_featured": True, "sort_order": 1,
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        created_id = body["id"]
        assert body["type"] == "live_webinar"
        assert body["slug"] == "webinar-de-carrera"
        assert body["is_featured"] is True

        # public list incluye el evento de comunidad
        pub = client.get("/api/v1/community-events")
        assert pub.status_code == 200
        ids = {e["id"] for e in pub.json()["items"]}
        assert created_id in ids

        # patch: dejar de destacar + cambiar tipo a material
        patch = client.patch(
            f"/api/v1/admin/community-events/{created_id}", headers=headers,
            json={"is_featured": False, "type": "material"},
        )
        assert patch.status_code == 200
        assert patch.json()["is_featured"] is False
        assert patch.json()["type"] == "material"

        # delete
        assert client.delete(
            f"/api/v1/admin/community-events/{created_id}", headers=headers
        ).status_code == 204
        gone = client.get(f"/api/v1/community-events/{created_id}")
        assert gone.status_code == 404
        created_id = None
    finally:
        if created_id:
            _cleanup_event(uuid.UUID(created_id))


def test_learning_content_events_are_not_community(client: TestClient, factory, auth_headers) -> None:
    slug = f"learning-{uuid.uuid4().hex[:8]}"
    learning_id = _make_learning_event(slug)
    try:
        pub = client.get("/api/v1/community-events")
        ids = {e["id"] for e in pub.json()["items"]}
        # El evento con career_path NO aparece como evento de comunidad.
        assert str(learning_id) not in ids
    finally:
        _cleanup_event(learning_id)


def test_admin_write_requires_admin(client: TestClient, factory, auth_headers) -> None:
    collab = _collab_headers(factory, auth_headers)
    r = client.post(
        "/api/v1/admin/community-events", headers=collab,
        json={"type": "material", "title": "x"},
    )
    assert r.status_code == 403
    assert client.post("/api/v1/admin/community-events", json={"type": "material", "title": "x"}).status_code in (401, 403)
