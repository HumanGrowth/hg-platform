"""Capa Empresa · TASK 8: Áreas de contenido + gating por Empresa.

Una unit es visible si es general (``area_code IS NULL``) o su Área está
habilitada para la Empresa del user (row en ``company_area_access``). Cubre:
lectura (by-dimension), acceso directo (404), asignación (422), motor de ruta y
los endpoints admin (catálogo de Áreas + entitlements por Empresa).
"""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.company.models import CompanyAreaAccess
from hg.modules.identity.models import UserRole

from ._lu_helpers import cleanup_units, make_unit

API = "/api/v1"


def _grant(session, company_id, area_code: str) -> None:
    session.add(CompanyAreaAccess(company_id=company_id, area_code=area_code))
    session.commit()


# ─────────────────────────── Lectura (gating) ───────────────────────────


def test_by_dimension_hides_non_enabled_areas(client: TestClient, factory, auth_headers) -> None:
    """Con MFG habilitado, el user ve el contenido general + MFG (CP → P1), nunca IT."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    _grant(s, user.company_id, "MFG")

    general = make_unit(s, dimension_code="CP")
    mfg = make_unit(s, dimension_code="CP", area_code="MFG")
    it = make_unit(s, dimension_code="CP", area_code="IT")
    ids = [general.id, mfg.id, it.id]
    try:
        res = client.get(
            f"{API}/modulos/by-dimension", params={"dimension_code": "P1"}, headers=auth_headers(user)
        )
        assert res.status_code == 200, res.text
        slugs = {item["slug"] for item in res.json()}
        assert general.slug in slugs
        assert mfg.slug in slugs
        assert it.slug not in slugs  # Área no habilitada → oculta
    finally:
        cleanup_units(s, ids)


def test_direct_access_to_non_enabled_area_is_404(client: TestClient, factory, auth_headers) -> None:
    """Acceder por slug a una unit de un Área no habilitada devuelve 404 (no filtra
    su existencia); el contenido general sí se ve."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)  # sin accesos → solo general

    general = make_unit(s, dimension_code="CP", n_blocks=0)
    it = make_unit(s, dimension_code="CP", area_code="IT", n_blocks=0)
    ids = [general.id, it.id]
    try:
        assert (
            client.get(f"{API}/modulos/{general.slug}", headers=auth_headers(user)).status_code == 200
        )
        assert (
            client.get(f"{API}/modulos/{it.slug}", headers=auth_headers(user)).status_code == 404
        )
    finally:
        cleanup_units(s, ids)


def test_superadmin_sees_all_areas(client: TestClient, factory, auth_headers) -> None:
    """El superadmin HG no se filtra por Área (ve todo el catálogo)."""
    s = factory.session
    org = factory.make_org()
    sa = factory.make_user(org=org, role=UserRole.superadmin)  # sin accesos de Empresa

    it = make_unit(s, dimension_code="CP", area_code="IT", n_blocks=0)
    try:
        assert client.get(f"{API}/modulos/{it.slug}", headers=auth_headers(sa)).status_code == 200
    finally:
        cleanup_units(s, [it.id])


def test_path_excludes_non_enabled_areas(client: TestClient, factory, auth_headers) -> None:
    """El motor de ruta (/me/path) nunca propone units de un Área no habilitada."""
    from sqlalchemy import select

    from hg.modules.learning.models import CareerPath

    s = factory.session
    if s.scalar(select(CareerPath).where(CareerPath.code == "P1")) is None:
        s.add(CareerPath(code="P1", name="Carrera", order_index=1))
        s.commit()

    org = factory.make_org()
    user = factory.make_user(org=org)  # sin accesos → solo general

    general = make_unit(s, dimension_code="CP", n_blocks=0)
    it = make_unit(s, dimension_code="CP", area_code="IT", n_blocks=0)
    ids = [general.id, it.id]
    try:
        res = client.get(f"{API}/me/path", headers=auth_headers(user))
        assert res.status_code == 200, res.text
        body = res.json()
        slugs = {step["slug"] for step in body["upcoming"]}
        if body["next_step"]:
            slugs.add(body["next_step"]["slug"])
        assert it.slug not in slugs
    finally:
        cleanup_units(s, ids)


# ─────────────────────────── Asignación ───────────────────────────


def test_assign_blocks_non_enabled_area(client: TestClient, factory, auth_headers) -> None:
    """El admin no puede asignar contenido de un Área que la Empresa no tiene
    habilitada; general y MFG (habilitada) sí."""
    s = factory.session
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    target = factory.make_user(org=org)
    _grant(s, org.company_id, "MFG")

    general = make_unit(s, dimension_code="CP")
    mfg = make_unit(s, dimension_code="CP", area_code="MFG")
    it = make_unit(s, dimension_code="CP", area_code="IT")
    ids = [general.id, mfg.id, it.id]
    try:
        blocked = client.post(
            f"{API}/admin/users/{target.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(general.id), str(it.id)]},
        )
        assert blocked.status_code == 422, blocked.text
        assert "no habilitada" in blocked.text.lower()

        ok = client.post(
            f"{API}/admin/users/{target.id}/assignments",
            headers=auth_headers(admin),
            json={"unit_ids": [str(general.id), str(mfg.id)]},
        )
        assert ok.status_code == 201, ok.text
        assert len(ok.json()) == 2
    finally:
        cleanup_units(s, ids)


# ─────────────────────────── Admin: catálogo + entitlements ───────────────────────────


def test_admin_areas_crud_and_company_access(client: TestClient, factory, auth_headers) -> None:
    """Superadmin: lista el catálogo seed, crea un Área nueva y setea/lee los
    entitlements de una Empresa (PUT reemplaza el set completo)."""
    s = factory.session
    org = factory.make_org()
    sa = factory.make_user(org=org, role=UserRole.superadmin)
    company_id = org.company_id

    # Catálogo seed (MFG/IT/CC de la migración CE-02).
    listed = client.get(f"{API}/admin/areas", headers=auth_headers(sa))
    assert listed.status_code == 200, listed.text
    codes = {a["code"] for a in listed.json()}
    assert {"MFG", "IT", "CC"} <= codes

    # Crear un Área nueva.
    new_code = "QA"
    created = client.post(
        f"{API}/admin/areas", headers=auth_headers(sa),
        json={"code": new_code, "name": "Calidad"},
    )
    assert created.status_code == 201, created.text

    # Setear accesos de la Empresa (reemplaza el set completo).
    put = client.put(
        f"{API}/admin/companies/{company_id}/access",
        headers=auth_headers(sa),
        json={"area_codes": ["MFG", new_code]},
    )
    assert put.status_code == 200, put.text
    assert set(put.json()["area_codes"]) == {"MFG", new_code}

    got = client.get(f"{API}/admin/companies/{company_id}/access", headers=auth_headers(sa))
    assert got.status_code == 200, got.text
    assert set(got.json()["area_codes"]) == {"MFG", new_code}

    # PUT idempotente / diff: reemplazar por solo IT revoca MFG y QA.
    replaced = client.put(
        f"{API}/admin/companies/{company_id}/access",
        headers=auth_headers(sa), json={"area_codes": ["IT"]},
    )
    assert replaced.status_code == 200, replaced.text
    assert replaced.json()["area_codes"] == ["IT"]

    # Área inexistente → 422.
    bad = client.put(
        f"{API}/admin/companies/{company_id}/access",
        headers=auth_headers(sa), json={"area_codes": ["ZZ"]},
    )
    assert bad.status_code == 422, bad.text

    # Limpieza del Área creada (los accesos QA ya se revocaron arriba).
    from hg.modules.learning_units.models import Area

    area = s.get(Area, new_code)
    if area is not None:
        s.delete(area)
        s.commit()
