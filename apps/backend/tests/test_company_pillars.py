"""EP-01: pilares habilitados por Empresa (superadmin) — default los 6; un pilar
deshabilitado oculta su contenido y bloquea asignarlo."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import ModuleAssignment

from ._lu_helpers import cleanup_units, make_unit

API = "/api/v1"


def test_default_all_pillars_enabled_and_superadmin_can_set(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org()
    sa = factory.make_user(org=org, role=UserRole.superadmin)
    url = f"{API}/admin/companies/{org.company_id}/access"

    assert client.get(url, headers=auth_headers(sa)).json()["pillar_codes"] == [
        "CP", "PR", "RE", "SA", "PI", "ES",
    ]
    put = client.put(url, headers=auth_headers(sa), json={"area_codes": [], "pillar_codes": ["CP", "SA"]})
    assert put.status_code == 200, put.text
    assert put.json()["pillar_codes"] == ["CP", "SA"]

    # Un PUT sin pilar_codes no los toca.
    keep = client.put(url, headers=auth_headers(sa), json={"area_codes": []})
    assert keep.json()["pillar_codes"] == ["CP", "SA"]

    bad = client.put(url, headers=auth_headers(sa), json={"area_codes": [], "pillar_codes": ["ZZ"]})
    assert bad.status_code == 422


def test_disabled_pillar_hides_content_and_blocks_assignment(
    client: TestClient, factory, auth_headers
) -> None:
    s = factory.session
    org = factory.make_org()
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    admin = factory.make_user(org=org, role=UserRole.admin)
    user = factory.make_user(org=org)

    cp = make_unit(s, dimension_code="CP")
    pr = make_unit(s, dimension_code="PR")
    ids = [cp.id, pr.id]
    # Gradúa al user de la restricción de onboarding para ejercer el gating.
    s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=cp.id))
    s.commit()
    try:
        client.put(
            f"{API}/admin/companies/{org.company_id}/access",
            headers=auth_headers(sa),
            json={"area_codes": [], "pillar_codes": ["CP"]},  # PR deshabilitado
        )
        res = client.get(
            f"{API}/modulos/by-dimension", params={"dimension_code": "P2"}, headers=auth_headers(user)
        )
        assert res.status_code == 200, res.text
        assert pr.slug not in {i["slug"] for i in res.json()}
        assert client.get(f"{API}/modulos/{pr.slug}", headers=auth_headers(user)).status_code == 404

        # Habilitarlo de nuevo lo hace visible.
        client.put(
            f"{API}/admin/companies/{org.company_id}/access",
            headers=auth_headers(sa),
            json={"area_codes": [], "pillar_codes": ["CP", "PR"]},
        )
        assert client.get(f"{API}/modulos/{pr.slug}", headers=auth_headers(user)).status_code == 200

        # CP deshabilitado → no se puede asignar CP a la empresa.
        client.put(
            f"{API}/admin/companies/{org.company_id}/access",
            headers=auth_headers(sa),
            json={"area_codes": [], "pillar_codes": ["PR"]},
        )
        res = client.post(
            f"{API}/admin/users/{user.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(cp.id)]},
        )
        assert res.status_code == 422, res.text
    finally:
        cleanup_units(s, ids)
