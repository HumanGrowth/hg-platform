"""Enrollments — endpoints + RLS (B4-A)."""
from __future__ import annotations

from uuid import UUID

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from hg.db import SessionLocal
from hg.modules.learning.models import CareerPath, Enrollment


def _count(user_id: UUID, code: str | None = None) -> int:
    s = SessionLocal()
    try:
        conds = [Enrollment.user_id == user_id]
        if code:
            pid = s.scalar(select(CareerPath.id).where(CareerPath.code == code))
            conds.append(Enrollment.career_path_id == pid)
        return s.scalar(select(func.count()).select_from(Enrollment).where(*conds)) or 0
    finally:
        s.close()


def _is_active(user_id: UUID, code: str) -> bool:
    s = SessionLocal()
    try:
        pid = s.scalar(select(CareerPath.id).where(CareerPath.code == code))
        return bool(
            s.scalar(
                select(Enrollment.is_active).where(
                    Enrollment.user_id == user_id, Enrollment.career_path_id == pid
                )
            )
        )
    finally:
        s.close()


def test_enroll_user_creates_row(client: TestClient, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    res = client.post(
        f"/api/v1/manager/users/{mw.r1.id}/enroll",
        headers=auth_headers(mw.manager),
        json={"career_path_code": "P1"},
    )
    assert res.status_code == 201, res.text
    assert res.json()["career_path_code"] == "P1"
    assert _count(mw.r1.id, "P1") == 1


def test_enroll_user_reactivates_inactive(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    h = auth_headers(mw.manager)
    client.post(f"/api/v1/manager/users/{mw.r1.id}/enroll", headers=h, json={"career_path_code": "P2"})
    client.delete(f"/api/v1/manager/users/{mw.r1.id}/enroll/P2", headers=h)
    res = client.post(f"/api/v1/manager/users/{mw.r1.id}/enroll", headers=h, json={"career_path_code": "P2"})
    assert res.status_code == 201, res.text
    assert _count(mw.r1.id, "P2") == 1  # sin duplicar
    assert _is_active(mw.r1.id, "P2") is True


def test_unenroll_user_soft_deletes(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    h = auth_headers(mw.manager)
    client.post(f"/api/v1/manager/users/{mw.r1.id}/enroll", headers=h, json={"career_path_code": "P3"})
    res = client.delete(f"/api/v1/manager/users/{mw.r1.id}/enroll/P3", headers=h)
    assert res.status_code == 204
    assert _count(mw.r1.id, "P3") == 1  # sigue existiendo
    assert _is_active(mw.r1.id, "P3") is False


def test_enrollment_cross_org_isolation(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    other_user = factory.make_user(org=factory.make_org())  # otra org
    res = client.post(
        f"/api/v1/manager/users/{other_user.id}/enroll",
        headers=auth_headers(mw.manager),
        json={"career_path_code": "P1"},
    )
    assert res.status_code == 404  # RLS: el manager no ve users de otra org


def test_enroll_invalid_path_code_422(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    res = client.post(
        f"/api/v1/manager/users/{mw.r1.id}/enroll",
        headers=auth_headers(mw.manager),
        json={"career_path_code": "P9"},
    )
    assert res.status_code == 422


def test_list_user_enrollments_active_only(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    h = auth_headers(mw.manager)
    client.post(f"/api/v1/manager/users/{mw.r1.id}/enroll", headers=h, json={"career_path_code": "P1"})
    client.post(f"/api/v1/manager/users/{mw.r1.id}/enroll", headers=h, json={"career_path_code": "P2"})
    client.delete(f"/api/v1/manager/users/{mw.r1.id}/enroll/P2", headers=h)
    detail = client.get(f"/api/v1/manager/users/{mw.r1.id}/detail", headers=h).json()
    assert detail["active_enrollments"] == 1
    active = [e for e in detail["enrollments"] if e["is_active"]]
    assert {e["career_path_code"] for e in active} == {"P1"}
