"""FASE 2.1: asignación de módulos a nivel organización (materializa, puntual)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import Area, LearningUnit


def _make_unit(*, area_code: str | None = None, dimension_code: str = "CP") -> uuid.UUID:
    s = SessionLocal()
    try:
        u = LearningUnit(
            slug=f"orgasgn-{uuid.uuid4().hex[:8]}", title="t", dimension_code=dimension_code,
            level_code="L1", pillar_code="P1", unit_number=1, published_at=datetime.now(UTC),
            area_code=area_code,
        )
        s.add(u)
        s.commit()
        return u.id
    finally:
        s.close()


def _cleanup(unit_ids: list[uuid.UUID]) -> None:
    s = SessionLocal()
    s.execute(delete(LearningUnit).where(LearningUnit.id.in_(unit_ids)))
    s.commit()
    s.close()


def test_admin_assigns_to_all_active_org_members(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    m1 = factory.make_user(org=org, role=UserRole.collaborator)
    m2 = factory.make_user(org=org, role=UserRole.collaborator)
    inactive = factory.make_user(org=org, role=UserRole.collaborator, is_active=False)
    u1 = _make_unit()
    try:
        res = client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        )
        assert res.status_code == 201, res.text
        body = res.json()
        # "TODOS los miembros ACTIVOS" incluye al propio admin (sin filtrar por
        # rol, como pide el doc) — 3 activos (admin, m1, m2), el inactivo no.
        assert body["members_targeted"] == 3
        assert body["units_targeted"] == 1
        assert body["assignments_created"] == 3
        assert body["already_assigned"] == 0

        mine1 = client.get("/api/v1/me/assignments", headers=auth_headers(m1))
        assert len(mine1.json()) == 1
        mine2 = client.get("/api/v1/me/assignments", headers=auth_headers(m2))
        assert len(mine2.json()) == 1
        # El inactivo ni siquiera pudo ser targeteado (excluido del query por
        # is_active); no se verifica vía /me porque un user inactivo no puede
        # autenticar en absoluto (get_current_user lo rechaza con 401).
        assert inactive.is_active is False
    finally:
        _cleanup([u1])


def test_org_assignment_is_idempotent(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    factory.make_user(org=org, role=UserRole.collaborator)
    u1 = _make_unit()
    try:
        first = client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        )
        assert first.json()["assignments_created"] == 2  # admin + 1 collaborator
        second = client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        )
        assert second.json()["assignments_created"] == 0
        assert second.json()["already_assigned"] == 2
    finally:
        _cleanup([u1])


def test_org_assignment_respects_area_gating(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    factory.make_user(org=org, role=UserRole.collaborator)
    # Área real (FK), pero SIN CompanyAreaAccess para la empresa del test →
    # sigue no-habilitada, exactamente el caso que el gating debe bloquear.
    area_code = f"Z{uuid.uuid4().hex[:2]}".upper()
    s = SessionLocal()
    s.add(Area(code=area_code, name="Test Area"))
    s.commit()
    s.close()
    u1 = _make_unit(area_code=area_code)
    try:
        res = client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        )
        assert res.status_code == 422
    finally:
        _cleanup([u1])
        s = SessionLocal()
        s.execute(delete(Area).where(Area.code == area_code))
        s.commit()
        s.close()


def test_admin_cannot_assign_to_organization_of_another_company(client, factory, auth_headers) -> None:
    org_a = factory.make_org()
    org_b = factory.make_org()  # distinta Company (factory crea una nueva por default)
    admin_a = factory.make_user(org=org_a, role=UserRole.admin)
    u1 = _make_unit()
    try:
        res = client.post(
            f"/api/v1/admin/organizations/{org_b.id}/assignments",
            headers=auth_headers(admin_a),
            json={"unit_ids": [str(u1)]},
        )
        assert res.status_code == 404
    finally:
        _cleanup([u1])


def test_manager_role_cannot_assign_at_org_level(client, factory, auth_headers) -> None:
    org = factory.make_org()
    manager = factory.make_user(org=org, role=UserRole.manager)
    u1 = _make_unit()
    try:
        res = client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(manager),
            json={"unit_ids": [str(u1)]},
        )
        assert res.status_code == 403
    finally:
        _cleanup([u1])


def test_org_assignments_summary_reports_counts(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    factory.make_user(org=org, role=UserRole.collaborator)
    factory.make_user(org=org, role=UserRole.collaborator)
    u1 = _make_unit()
    try:
        client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        )
        summary = client.get(
            f"/api/v1/admin/organizations/{org.id}/assignments-summary", headers=auth_headers(admin)
        )
        assert summary.status_code == 200, summary.text
        rows = summary.json()
        assert len(rows) == 1
        assert rows[0]["learning_unit_id"] == str(u1)
        assert rows[0]["assigned_count"] == 3  # admin + 2 collaborators, todos activos
        assert rows[0]["completed_count"] == 0
    finally:
        _cleanup([u1])


def test_org_assign_rejects_non_cp_units(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    non_cp = _make_unit(dimension_code="PR")
    try:
        res = client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(non_cp)]},
        )
        assert res.status_code == 422
        assert "Carrera Profesional" in res.json()["detail"]
    finally:
        _cleanup([non_cp])


def test_org_assignments_summary_counts_completed_from_attempts(client, factory, auth_headers) -> None:
    """H1: ``completed_count`` sale de los attempts completados, no de
    ``ModuleAssignment.status`` (que nadie actualiza)."""
    from ._lu_helpers import seed_attempt

    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    done = factory.make_user(org=org, role=UserRole.collaborator)
    factory.make_user(org=org, role=UserRole.collaborator)
    u1 = _make_unit()
    try:
        client.post(
            f"/api/v1/admin/organizations/{org.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(u1)]},
        )
        s = SessionLocal()
        try:
            unit = s.get(LearningUnit, u1)
            seed_attempt(s, org_id=org.id, user_id=done.id, unit=unit, when=datetime.now(UTC), completed=True)
        finally:
            s.close()

        rows = client.get(
            f"/api/v1/admin/organizations/{org.id}/assignments-summary", headers=auth_headers(admin)
        ).json()
        assert rows[0]["assigned_count"] == 3
        assert rows[0]["completed_count"] == 1
    finally:
        _cleanup([u1])
