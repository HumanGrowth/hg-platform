"""Course detail + progress endpoints (B2-07): upsert, completion, RLS."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerLevel, CareerPath, Course, CourseTrack


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


def _make_course(slug: str, *, is_active: bool = True) -> None:
    s = SessionLocal()
    try:
        s.add(Course(
            career_path_id=_p1_id(), title=slug, slug=slug, order_index=1,
            career_level=CareerLevel.L1, track=CourseTrack.competency, is_active=is_active,
            duration_seconds=300,
        ))
        s.commit()
    finally:
        s.close()


def _cleanup(slug: str) -> None:
    s = SessionLocal()
    cid = s.scalar(select(Course.id).where(Course.slug == slug))
    if cid:
        s.execute(delete(Course).where(Course.id == cid))  # CASCADE borra progress
        s.commit()
    s.close()


def _auth(factory, auth_headers):
    u = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    return auth_headers(u)


# ─────────────────────────── detail ───────────────────────────


def test_get_course_detail_unauth(client: TestClient) -> None:
    assert client.get("/api/v1/courses/whatever").status_code in (401, 403)


def test_get_course_detail_ok_with_no_progress(client: TestClient, factory, auth_headers) -> None:
    slug = "cp-detail-noprog"
    try:
        _make_course(slug)
        res = client.get(f"/api/v1/courses/{slug}", headers=_auth(factory, auth_headers))
        assert res.status_code == 200, res.text
        assert res.json()["progress"] is None
    finally:
        _cleanup(slug)


def test_get_course_detail_includes_progress_after_play(client, factory, auth_headers) -> None:
    slug = "cp-detail-withprog"
    h = _auth(factory, auth_headers)
    try:
        _make_course(slug)
        client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                    json={"position_seconds": 30, "watch_pct": 25.0})
        res = client.get(f"/api/v1/courses/{slug}", headers=h)
        assert res.status_code == 200, res.text
        prog = res.json()["progress"]
        assert prog is not None
        assert prog["last_position_seconds"] == 30
        assert prog["watch_pct"] == 25.0
        assert prog["is_completed"] is False
    finally:
        _cleanup(slug)


def test_get_course_detail_404_inactive(client: TestClient, factory, auth_headers) -> None:
    slug = "cp-inactive"
    try:
        _make_course(slug, is_active=False)
        res = client.get(f"/api/v1/courses/{slug}", headers=_auth(factory, auth_headers))
        assert res.status_code == 404
    finally:
        _cleanup(slug)


# ─────────────────────────── progress upsert ───────────────────────────


def test_post_progress_creates_row_first_time(client, factory, auth_headers) -> None:
    slug = "cp-create"
    h = _auth(factory, auth_headers)
    try:
        _make_course(slug)
        res = client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                          json={"position_seconds": 10, "watch_pct": 5.0})
        assert res.status_code == 200, res.text
        assert res.json()["last_position_seconds"] == 10
    finally:
        _cleanup(slug)


def test_post_progress_updates_existing(client, factory, auth_headers) -> None:
    slug = "cp-update"
    h = _auth(factory, auth_headers)
    try:
        _make_course(slug)
        client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                    json={"position_seconds": 10, "watch_pct": 5.0})
        res = client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                          json={"position_seconds": 120, "watch_pct": 40.0})
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["last_position_seconds"] == 120
        assert body["watch_pct"] == 40.0
        assert body["is_completed"] is False
    finally:
        _cleanup(slug)


def test_post_progress_marks_completed_at_80(client, factory, auth_headers) -> None:
    slug = "cp-complete"
    h = _auth(factory, auth_headers)
    try:
        _make_course(slug)
        res = client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                          json={"position_seconds": 240, "watch_pct": 80.0})
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["is_completed"] is True
        assert body["completed_at"] is not None
    finally:
        _cleanup(slug)


def test_post_progress_completed_at_immutable(client, factory, auth_headers) -> None:
    slug = "cp-immutable"
    h = _auth(factory, auth_headers)
    try:
        _make_course(slug)
        first = client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                            json={"position_seconds": 240, "watch_pct": 80.0}).json()
        third = client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                            json={"position_seconds": 280, "watch_pct": 90.0}).json()
        assert third["is_completed"] is True
        assert third["completed_at"] == first["completed_at"]  # preservado
        assert third["watch_pct"] == 90.0
    finally:
        _cleanup(slug)


def test_progress_cross_org_isolation(client, factory, auth_headers) -> None:
    slug = "cp-crossorg"
    user_a = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    user_b = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    try:
        _make_course(slug)
        # A guarda progreso.
        client.post(f"/api/v1/courses/{slug}/progress", headers=auth_headers(user_a),
                    json={"position_seconds": 50, "watch_pct": 30.0})
        # B (otra org) no ve el progreso de A.
        res = client.get(f"/api/v1/courses/{slug}", headers=auth_headers(user_b))
        assert res.status_code == 200, res.text
        assert res.json()["progress"] is None
    finally:
        _cleanup(slug)


def test_post_progress_validation(client, factory, auth_headers) -> None:
    slug = "cp-validation"
    h = _auth(factory, auth_headers)
    try:
        _make_course(slug)
        res = client.post(f"/api/v1/courses/{slug}/progress", headers=h,
                          json={"position_seconds": 10, "watch_pct": 120.0})
        assert res.status_code == 422
    finally:
        _cleanup(slug)
