"""EP-01/EP-02: acceso de contenido por Empresa (superadmin). Una DIMENSIÓN (CP, PR, …)
contiene PILARES (P1..P5/AI en CP, V0..Vn en PR). Default: todo habilitado; una
dimensión deshabilitada o un pilar deshabilitado oculta su contenido y bloquea
asignarlo."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole
from hg.modules.learning_units.models import ModuleAssignment

from ._lu_helpers import cleanup_units, make_unit

API = "/api/v1"


def _dim(body: dict, code: str) -> dict:
    return next(d for d in body["dimensions"] if d["code"] == code)


def test_default_all_enabled_and_catalog_lists_pillars_per_dimension(
    client: TestClient, factory, auth_headers
) -> None:
    s = factory.session
    org = factory.make_org()
    sa = factory.make_user(org=org, role=UserRole.superadmin)
    u1 = make_unit(s, dimension_code="CP", pillar_code="P1")
    u2 = make_unit(s, dimension_code="CP", pillar_code="AI")
    try:
        body = client.get(
            f"{API}/admin/companies/{org.company_id}/access", headers=auth_headers(sa)
        ).json()
        assert body["dimension_codes"] == ["CP", "PR", "RE", "SA", "PI", "ES"]
        assert body["disabled_pillars"] == []
        cp = _dim(body, "CP")
        assert cp["enabled"] is True
        codes = [p["code"] for p in cp["pillars"]]
        assert "P1" in codes and "AI" in codes
        assert codes.index("AI") > codes.index("P1")  # "AI" va último
        assert all(p["enabled"] for p in cp["pillars"])
    finally:
        cleanup_units(s, [u1.id, u2.id])


def test_put_validates_and_keeps_untouched_fields(client: TestClient, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    sa = factory.make_user(org=org, role=UserRole.superadmin)
    unit = make_unit(s, dimension_code="CP", pillar_code="P3")
    url = f"{API}/admin/companies/{org.company_id}/access"
    try:
        put = client.put(
            url,
            headers=auth_headers(sa),
            json={"area_codes": [], "dimension_codes": ["CP", "SA"], "disabled_pillars": ["CP:P3"]},
        )
        assert put.status_code == 200, put.text
        assert put.json()["dimension_codes"] == ["CP", "SA"]
        assert put.json()["disabled_pillars"] == ["CP:P3"]
        assert next(p for p in _dim(put.json(), "CP")["pillars"] if p["code"] == "P3")["enabled"] is False

        # Un PUT que solo manda áreas no toca dimensiones ni pilares.
        keep = client.put(url, headers=auth_headers(sa), json={"area_codes": []})
        assert keep.json()["dimension_codes"] == ["CP", "SA"]
        assert keep.json()["disabled_pillars"] == ["CP:P3"]

        bad_dim = client.put(url, headers=auth_headers(sa), json={"area_codes": [], "dimension_codes": ["ZZ"]})
        assert bad_dim.status_code == 422
        bad_pillar = client.put(
            url, headers=auth_headers(sa), json={"area_codes": [], "disabled_pillars": ["CP:P99"]}
        )
        assert bad_pillar.status_code == 422
    finally:
        cleanup_units(s, [unit.id])


def test_disabled_dimension_and_pillar_hide_content_and_block_assignment(
    client: TestClient, factory, auth_headers
) -> None:
    s = factory.session
    org = factory.make_org()
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    admin = factory.make_user(org=org, role=UserRole.admin)
    user = factory.make_user(org=org)

    cp_p1 = make_unit(s, dimension_code="CP", pillar_code="P1")
    cp_p2 = make_unit(s, dimension_code="CP", pillar_code="P2")
    pr = make_unit(s, dimension_code="PR", pillar_code="V1")
    ids = [cp_p1.id, cp_p2.id, pr.id]
    # Gradúa al user de la restricción de onboarding para ejercer el gating.
    s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=cp_p1.id))
    s.commit()
    access = f"{API}/admin/companies/{org.company_id}/access"

    career = {"CP": "P1", "PR": "P2"}  # dimensión Drive → career path del listado

    def visible(unit) -> bool:
        # Listado por dimensión: aplica el gating de acceso pero no el bloqueo de
        # secuencia (el detalle por slug bloquea P2 hasta completar P1).
        res = client.get(
            f"{API}/modulos/by-dimension",
            params={"dimension_code": career[unit.dimension_code]},
            headers=auth_headers(user),
        )
        assert res.status_code == 200, res.text
        return unit.slug in {i["slug"] for i in res.json()}

    try:
        # Dimensión PR deshabilitada → su contenido se oculta.
        client.put(
            access, headers=auth_headers(sa),
            json={"area_codes": [], "dimension_codes": ["CP"]},
        )
        assert visible(cp_p1) and visible(cp_p2)
        assert not visible(pr)

        # Pilar CP:P2 deshabilitado → solo ese pilar se oculta; P1 sigue.
        client.put(
            access, headers=auth_headers(sa),
            json={"area_codes": [], "dimension_codes": ["CP", "PR"], "disabled_pillars": ["CP:P2"]},
        )
        assert visible(cp_p1) and visible(pr)
        assert not visible(cp_p2)

        # Asignar un pilar deshabilitado → 422; uno habilitado → 201.
        blocked = client.post(
            f"{API}/admin/users/{user.id}/assignments",
            headers=auth_headers(admin), json={"unit_ids": [str(cp_p2.id)]},
        )
        assert blocked.status_code == 422, blocked.text
        ok = client.post(
            f"{API}/admin/users/{user.id}/assignments",
            headers=auth_headers(admin), json={"unit_ids": [str(cp_p1.id)]},
        )
        assert ok.status_code in (201, 200), ok.text
    finally:
        cleanup_units(s, ids)
