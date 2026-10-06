"""OM-01: módulos por organización — los reciben los miembros actuales y todo
miembro que entre después (cambio de org / alta)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import LearningUnit


def _make_unit() -> uuid.UUID:
    s = SessionLocal()
    try:
        u = LearningUnit(
            slug=f"orgmod-{uuid.uuid4().hex[:8]}", title="Módulo org", dimension_code="CP",
            level_code="L1", pillar_code="P1", unit_number=1, published_at=datetime.now(UTC),
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


def test_new_member_in_org_gets_org_modules(client, factory, auth_headers) -> None:
    co = factory.make_company()
    org_a = factory.make_org(company=co, name="A")
    org_b = factory.make_org(company=co, name="B")
    admin = factory.make_user(org=org_a, role=UserRole.admin)
    newcomer = factory.make_user(org=org_b, role=UserRole.collaborator)
    unit = _make_unit()
    try:
        future = (datetime.now(UTC) + timedelta(days=30)).isoformat()
        res = client.post(
            f"/api/v1/admin/organizations/{org_a.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(unit)], "due_date": future, "note": "bienvenida"},
        )
        assert res.status_code == 201, res.text

        listed = client.get(
            f"/api/v1/admin/organizations/{org_a.id}/modules", headers=auth_headers(admin)
        )
        assert [m["learning_unit_id"] for m in listed.json()] == [str(unit)]

        # Antes de entrar a la org A no tiene nada.
        assert client.get("/api/v1/me/assignments", headers=auth_headers(newcomer)).json() == []

        # Se mueve a la org A → recibe el módulo de inmediato.
        moved = client.patch(
            f"/api/v1/company/members/{newcomer.id}",
            headers=auth_headers(admin),
            json={"org_id": str(org_a.id)},
        )
        assert moved.status_code == 200, moved.text
        # El token del user movido sigue apuntando a su org vieja (RLS): se re-emite.
        newcomer.org_id = org_a.id
        mine = client.get("/api/v1/me/assignments", headers=auth_headers(newcomer)).json()
        assert [a["learning_unit_id"] for a in mine] == [str(unit)]
        assert mine[0]["note"] == "bienvenida"
    finally:
        _cleanup([unit])


def test_removing_org_module_stops_inheritance_but_keeps_existing(
    client, factory, auth_headers
) -> None:
    co = factory.make_company()
    org_a = factory.make_org(company=co, name="A")
    org_b = factory.make_org(company=co, name="B")
    admin = factory.make_user(org=org_a, role=UserRole.admin)
    existing = factory.make_user(org=org_a, role=UserRole.collaborator)
    later = factory.make_user(org=org_b, role=UserRole.collaborator)
    unit = _make_unit()
    try:
        client.post(
            f"/api/v1/admin/organizations/{org_a.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(unit)]},
        )
        res = client.delete(
            f"/api/v1/admin/organizations/{org_a.id}/modules/{unit}", headers=auth_headers(admin)
        )
        assert res.status_code == 204

        # Lo ya asignado al miembro existente se conserva.
        assert len(client.get("/api/v1/me/assignments", headers=auth_headers(existing)).json()) == 1

        client.patch(
            f"/api/v1/company/members/{later.id}",
            headers=auth_headers(admin),
            json={"org_id": str(org_a.id)},
        )
        later.org_id = org_a.id
        assert client.get("/api/v1/me/assignments", headers=auth_headers(later)).json() == []
    finally:
        _cleanup([unit])


def test_admin_cannot_manage_modules_of_other_company_org(client, factory, auth_headers) -> None:
    org = factory.make_org(company=factory.make_company())
    admin = factory.make_user(org=org, role=UserRole.admin)
    other = factory.make_org(company=factory.make_company())
    res = client.get(f"/api/v1/admin/organizations/{other.id}/modules", headers=auth_headers(admin))
    assert res.status_code == 404
