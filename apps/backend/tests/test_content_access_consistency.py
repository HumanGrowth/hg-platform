"""LC-07: una sola regla de visibilidad de contenido (área + dimensión + pilar) para
listados Y acceso directo por slug (ADR-0016; invariante #6 de CLAUDE.md intacta)."""
from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole
from tests._lu_helpers import cleanup_units, make_unit

API = "/api/v1"
ALL_DIMS = ["CP", "PR", "RE", "SA", "PI", "ES"]


@pytest.fixture
def env(factory):
    s = factory.session
    units: list = []

    def build(*, enabled_dimensions=None, disabled_pillars=None, role=UserRole.collaborator):
        company = factory.make_company(
            enabled_dimensions=enabled_dimensions or ALL_DIMS,
            disabled_pillars=disabled_pillars or [],
        )
        org = factory.make_org(company=company)
        user = factory.make_user(org=org, role=role)
        return company, user

    def unit(**kw):
        u = make_unit(s, **kw)
        s.commit()
        units.append(u.id)
        return u

    yield SimpleNamespace(build=build, unit=unit)
    cleanup_units(s, units)
    s.commit()


def _direct_access(client: TestClient, headers, slug: str) -> dict[str, int]:
    """Status de TODAS las vías de acceso directo por slug."""
    return {
        "detail": client.get(f"{API}/modulos/{slug}", headers=headers).status_code,
        "start": client.post(f"{API}/modulos/{slug}/attempts/start", headers=headers).status_code,
        "attempt": client.get(f"{API}/modulos/{slug}/attempt", headers=headers).status_code,
    }


def test_disabled_dimension_is_404_by_slug_on_every_direct_path(client, env, auth_headers) -> None:
    _company, user = env.build(enabled_dimensions=["CP"])  # PR deshabilitada
    hidden = env.unit(dimension_code="PR")
    assert set(_direct_access(client, auth_headers(user), hidden.slug).values()) == {404}


def test_disabled_pillar_is_404_by_slug(client, env, auth_headers) -> None:
    _company, user = env.build(disabled_pillars=["CP:P3"])
    hidden = env.unit(dimension_code="CP", pillar_code="P3")
    assert set(_direct_access(client, auth_headers(user), hidden.slug).values()) == {404}


def test_sibling_pillar_and_enabled_dimension_stay_reachable(client, env, auth_headers) -> None:
    """Control: la regla no es "todo 404" — solo lo deshabilitado."""
    _company, user = env.build(enabled_dimensions=["CP"], disabled_pillars=["CP:P3"])
    ok_pillar = env.unit(dimension_code="CP", pillar_code="P2")
    ok_general = env.unit(dimension_code="CP")
    for u in (ok_pillar, ok_general):
        assert client.get(f"{API}/modulos/{u.slug}", headers=auth_headers(user)).status_code != 404


def test_listing_and_direct_access_agree(client, env, auth_headers) -> None:
    """Lo que el listado oculta, el acceso directo también (una sola regla)."""
    _company, user = env.build(enabled_dimensions=["CP"], disabled_pillars=["CP:P3"])
    visible = env.unit(dimension_code="CP", pillar_code="P2")
    hidden_dim = env.unit(dimension_code="PR")
    hidden_pillar = env.unit(dimension_code="CP", pillar_code="P3")
    h = auth_headers(user)

    feed = client.get(f"{API}/modulos/feed", headers=h).json()
    feed_slugs = {i["slug"] for i in (feed if isinstance(feed, list) else feed.get("items", []))}
    for u, expected in ((visible, True), (hidden_dim, False), (hidden_pillar, False)):
        direct_visible = client.get(f"{API}/modulos/{u.slug}", headers=h).status_code != 404
        assert direct_visible is expected, u.slug
        if not expected:
            assert u.slug not in feed_slugs, u.slug


def test_superadmin_sees_every_dimension(client, env, auth_headers) -> None:
    _company, su = env.build(enabled_dimensions=["CP"], role=UserRole.superadmin)
    hidden = env.unit(dimension_code="PR")
    # (200 si la unit tiene contenido real; el seed de test no lo crea → solo importa que NO sea 404)
    assert client.get(f"{API}/modulos/{hidden.slug}", headers=auth_headers(su)).status_code != 404


def test_user_can_see_unit_applies_the_same_rule_as_the_sql_predicate(factory, env) -> None:
    """Paridad entre el predicado SQL (listados) y el chequeo in-memory (unit puntual)
    sobre la matriz completa área, dimensión y pilar."""
    from itertools import product

    from sqlalchemy import select

    from hg.modules.company.models import CompanyAreaAccess
    from hg.modules.learning_units.area_access import user_can_see_unit, visible_units_predicate
    from hg.modules.learning_units.models import Area, LearningUnit

    s = factory.session
    company, user = env.build(enabled_dimensions=["CP", "SA"], disabled_pillars=["CP:P3", "SA:P9"])
    for code in ("LC7A", "LC7B"):
        if s.get(Area, code) is None:
            s.add(Area(code=code, name=code))
    s.flush()
    s.add(CompanyAreaAccess(company_id=company.id, area_code="LC7A"))
    s.commit()

    units = [
        env.unit(dimension_code=dim, pillar_code=pil, area_code=area)
        for dim, pil, area in product(["CP", "SA", "PR", "ON"], [None, "P3", "P1"], [None, "LC7A", "LC7B"])
    ]
    try:
        sql_visible = set(
            s.scalars(
                select(LearningUnit.id).where(
                    LearningUnit.id.in_([u.id for u in units]), visible_units_predicate(user)
                )
            ).all()
        )
        py_visible = {u.id for u in units if user_can_see_unit(s, user, u)}
        assert py_visible == sql_visible
        # y la matriz tiene de las dos clases (no es un test vacío)
        assert 0 < len(sql_visible) < len(units)
    finally:
        from sqlalchemy import delete

        s.execute(delete(CompanyAreaAccess).where(CompanyAreaAccess.company_id == company.id))
        s.commit()


def test_user_can_see_unit_superadmin_and_gating(factory, env) -> None:
    from hg.modules.learning_units.area_access import user_can_see_unit

    s = factory.session
    _c, user = env.build(enabled_dimensions=["CP"], disabled_pillars=["CP:P3"])
    _c2, su = env.build(enabled_dimensions=["CP"], role=UserRole.superadmin)
    assert user_can_see_unit(s, user, env.unit(dimension_code="CP", pillar_code="P2")) is True
    assert user_can_see_unit(s, user, env.unit(dimension_code="CP", pillar_code="P3")) is False  # pilar
    assert user_can_see_unit(s, user, env.unit(dimension_code="PR")) is False  # dimensión (antes: True)
    assert user_can_see_unit(s, user, env.unit(dimension_code="ON")) is True  # no gobernable
    assert user_can_see_unit(s, su, env.unit(dimension_code="PR")) is True
