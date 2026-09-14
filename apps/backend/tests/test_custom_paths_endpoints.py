"""FASE 2.2: CRUD de CustomPath (endpoints admin/company_admin/superadmin)."""
from __future__ import annotations

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.paths.models import CustomPath

from ._lu_helpers import cleanup_units, make_unit


def _cleanup_path(custom_path_id) -> None:
    from sqlalchemy import delete

    s = SessionLocal()
    s.execute(delete(CustomPath).where(CustomPath.id == custom_path_id))
    s.commit()
    s.close()


def test_admin_creates_org_scope_path_and_sets_items(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    unit = make_unit(factory.session, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        created = client.post(
            "/api/v1/admin/custom-paths",
            headers=auth_headers(admin),
            json={"name": "Onboarding Ventas", "scope": "org", "org_id": str(org.id)},
        )
        assert created.status_code == 201, created.text
        path_id = created.json()["id"]
        assert created.json()["items"] == []

        items_res = client.put(
            f"/api/v1/admin/custom-paths/{path_id}/items",
            headers=auth_headers(admin),
            json={"items": [{"learning_unit_id": str(unit.id), "is_required": True}]},
        )
        assert items_res.status_code == 200, items_res.text
        assert len(items_res.json()["items"]) == 1
        assert items_res.json()["items"][0]["unit_slug"]

        listed = client.get(
            f"/api/v1/admin/custom-paths?org_id={org.id}", headers=auth_headers(admin)
        )
        assert listed.status_code == 200
        assert any(p["id"] == path_id for p in listed.json())
    finally:
        _cleanup_path(created.json()["id"])
        cleanup_units(factory.session, [unit.id])


def test_create_org_scope_requires_org_in_actor_company(client, factory, auth_headers) -> None:
    org_a = factory.make_org()
    org_b = factory.make_org()  # otra Company
    admin_a = factory.make_user(org=org_a, role=UserRole.admin)
    res = client.post(
        "/api/v1/admin/custom-paths",
        headers=auth_headers(admin_a),
        json={"name": "x", "scope": "org", "org_id": str(org_b.id)},
    )
    assert res.status_code == 404


def test_org_scope_without_org_id_is_422(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    res = client.post(
        "/api/v1/admin/custom-paths",
        headers=auth_headers(admin),
        json={"name": "x", "scope": "org"},
    )
    assert res.status_code == 422


def test_manager_cannot_manage_custom_paths(client, factory, auth_headers) -> None:
    org = factory.make_org()
    manager = factory.make_user(org=org, role=UserRole.manager)
    res = client.post(
        "/api/v1/admin/custom-paths",
        headers=auth_headers(manager),
        json={"name": "x", "scope": "company"},
    )
    assert res.status_code == 403


def test_item_gating_by_area_is_enforced(client, factory, auth_headers) -> None:
    from sqlalchemy import delete

    from hg.modules.learning_units.models import Area

    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    area_code = "ZQP"
    factory.session.add(Area(code=area_code, name="Test"))
    factory.session.commit()
    unit = make_unit(
        factory.session, dimension_code="CP", level_code="L1", n_blocks=1, area_code=area_code
    )
    created = client.post(
        "/api/v1/admin/custom-paths",
        headers=auth_headers(admin),
        json={"name": "Gated", "scope": "company"},
    )
    path_id = created.json()["id"]
    try:
        res = client.put(
            f"/api/v1/admin/custom-paths/{path_id}/items",
            headers=auth_headers(admin),
            json={"items": [{"learning_unit_id": str(unit.id)}]},
        )
        assert res.status_code == 422
    finally:
        _cleanup_path(path_id)
        cleanup_units(factory.session, [unit.id])
        factory.session.execute(delete(Area).where(Area.code == area_code))
        factory.session.commit()


def test_set_assignments_and_resolved_path(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    member = factory.make_user(org=org, role=UserRole.collaborator)
    created = client.post(
        "/api/v1/admin/custom-paths",
        headers=auth_headers(admin),
        json={"name": "Puntual", "scope": "company"},
    )
    path_id = created.json()["id"]
    try:
        # Sin asignación puntual: aplica por scope=company de la empresa.
        resolved = client.get(
            f"/api/v1/admin/users/{member.id}/custom-path", headers=auth_headers(admin)
        )
        assert resolved.status_code == 200
        assert resolved.json()["custom_path_name"] == "Puntual"

        # Otra ruta, asignada directamente al miembro → gana precedencia.
        direct = client.post(
            "/api/v1/admin/custom-paths",
            headers=auth_headers(admin),
            json={"name": "Directa", "scope": "company"},
        )
        direct_id = direct.json()["id"]
        assign = client.put(
            f"/api/v1/admin/custom-paths/{direct_id}/assignments",
            headers=auth_headers(admin),
            json={"user_ids": [str(member.id)]},
        )
        assert assign.status_code == 200
        assert assign.json()["assigned_member_count"] == 1

        resolved2 = client.get(
            f"/api/v1/admin/users/{member.id}/custom-path", headers=auth_headers(admin)
        )
        assert resolved2.json()["custom_path_name"] == "Directa"
        _cleanup_path(direct_id)
    finally:
        _cleanup_path(path_id)


def test_assignment_rejects_member_outside_company(client, factory, auth_headers) -> None:
    org_a = factory.make_org()
    org_b = factory.make_org()
    admin_a = factory.make_user(org=org_a, role=UserRole.admin)
    outsider = factory.make_user(org=org_b, role=UserRole.collaborator)
    created = client.post(
        "/api/v1/admin/custom-paths",
        headers=auth_headers(admin_a),
        json={"name": "x", "scope": "company"},
    )
    path_id = created.json()["id"]
    try:
        res = client.put(
            f"/api/v1/admin/custom-paths/{path_id}/assignments",
            headers=auth_headers(admin_a),
            json={"user_ids": [str(outsider.id)]},
        )
        assert res.status_code == 422
    finally:
        _cleanup_path(path_id)
