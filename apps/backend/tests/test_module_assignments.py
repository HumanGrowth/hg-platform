"""Asignaciones de módulos — permisos + CRUD + dedup (cierre-beta TASK 3)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import LearningUnit


def _make_unit() -> uuid.UUID:
    s = SessionLocal()
    try:
        u = LearningUnit(
            slug=f"asgn-{uuid.uuid4().hex[:8]}", title="t", dimension_code="CP",
            level_code="L1", pillar_number=1, unit_number=1, published_at=datetime.now(UTC),
        )
        s.add(u)
        s.commit()
        return u.id
    finally:
        s.close()


def _cleanup(unit_ids: list[uuid.UUID]) -> None:
    s = SessionLocal()
    s.execute(delete(LearningUnit).where(LearningUnit.id.in_(unit_ids)))  # CASCADE borra assignments
    s.commit()
    s.close()


def test_manager_assigns_to_report_and_report_sees_them(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    u1, u2 = _make_unit(), _make_unit()
    try:
        res = client.post(
            f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(mgr),
            json={"unit_ids": [str(u1), str(u2)], "note": "Empezá por estos"},
        )
        assert res.status_code == 201, res.text
        assert len(res.json()) == 2
        assert {a["learning_unit_id"] for a in res.json()} == {str(u1), str(u2)}
        assert res.json()[0]["assigned_by_name"] == mgr.full_name

        # el reporte ve sus asignaciones
        mine = client.get("/api/v1/me/assignments", headers=auth_headers(report))
        assert mine.status_code == 200
        assert {a["learning_unit_id"] for a in mine.json()} == {str(u1), str(u2)}

        # el manager lista las del reporte
        listed = client.get(f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(mgr))
        assert len(listed.json()) == 2
    finally:
        _cleanup([u1, u2])


def test_assign_is_idempotent_dedup(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    u1 = _make_unit()
    try:
        first = client.post(
            f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(mgr),
            json={"unit_ids": [str(u1)]},
        )
        assert len(first.json()) == 1
        again = client.post(
            f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(mgr),
            json={"unit_ids": [str(u1)]},
        )
        assert again.status_code == 201
        assert again.json() == []  # ya estaba asignado → no duplica
        listed = client.get(f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(mgr))
        assert len(listed.json()) == 1
    finally:
        _cleanup([u1])


def test_collaborator_cannot_assign(client, factory, auth_headers) -> None:
    org = factory.make_org()
    collab = factory.make_user(org=org, role=UserRole.collaborator)
    other = factory.make_user(org=org, role=UserRole.collaborator)
    u1 = _make_unit()
    try:
        res = client.post(
            f"/api/v1/admin/users/{other.id}/assignments", headers=auth_headers(collab),
            json={"unit_ids": [str(u1)]},
        )
        assert res.status_code == 403
    finally:
        _cleanup([u1])


def test_manager_cannot_assign_to_non_report(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    stranger = factory.make_user(org=org, role=UserRole.collaborator)  # sin manager_id = mgr
    u1 = _make_unit()
    try:
        res = client.post(
            f"/api/v1/admin/users/{stranger.id}/assignments", headers=auth_headers(mgr),
            json={"unit_ids": [str(u1)]},
        )
        assert res.status_code == 404
    finally:
        _cleanup([u1])


def test_assign_nonexistent_unit_422(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    report = factory.make_user(org=org, role=UserRole.collaborator)
    res = client.post(
        f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(admin),
        json={"unit_ids": [str(uuid.uuid4())]},
    )
    assert res.status_code == 422


def test_patch_and_delete_assignment(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    report = factory.make_user(org=org, role=UserRole.collaborator)
    u1 = _make_unit()
    try:
        created = client.post(
            f"/api/v1/admin/users/{report.id}/assignments", headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        ).json()
        aid = created[0]["id"]

        patched = client.patch(
            f"/api/v1/admin/assignments/{aid}", headers=auth_headers(admin),
            json={"note": "Prioridad alta", "due_date": "2026-09-01T00:00:00Z"},
        )
        assert patched.status_code == 200
        assert patched.json()["note"] == "Prioridad alta"
        assert patched.json()["due_date"] is not None

        deleted = client.delete(f"/api/v1/admin/assignments/{aid}", headers=auth_headers(admin))
        assert deleted.status_code == 204
        assert client.get("/api/v1/me/assignments", headers=auth_headers(report)).json() == []
    finally:
        _cleanup([u1])
