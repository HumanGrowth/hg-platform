"""FASE 2.2: resolución de CustomPath + integración con path_engine.

Usa `_lu_helpers.make_unit` (limpieza acotada por unit_id, NO el `_clear_all()`
global de `test_path_engine.py`) para no tocar contenido real del catálogo.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import delete

from hg.modules.learning_units import path_engine
from hg.modules.paths.models import (
    CustomPath,
    CustomPathAssignment,
    CustomPathItem,
    CustomPathScope,
)
from hg.modules.paths.resolution import resolve_custom_path

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


def _cleanup_paths(ids: list) -> None:
    s_ids = [p.id if hasattr(p, "id") else p for p in ids]
    from hg.db import SessionLocal

    s = SessionLocal()
    s.execute(delete(CustomPath).where(CustomPath.id.in_(s_ids)))
    s.commit()
    s.close()


def test_resolve_none_without_any_custom_path(factory) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    assert resolve_custom_path(factory.session, user) is None


def test_resolve_company_scope(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    cp = CustomPath(name="Empresa X", scope=CustomPathScope.company, company_id=org.company_id)
    s.add(cp)
    s.commit()
    try:
        resolved = resolve_custom_path(s, user)
        assert resolved is not None
        assert resolved.id == cp.id
    finally:
        _cleanup_paths([cp])


def test_org_scope_overrides_company_scope(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    company_cp = CustomPath(name="Empresa", scope=CustomPathScope.company, company_id=org.company_id)
    org_cp = CustomPath(
        name="Org", scope=CustomPathScope.org, company_id=org.company_id, org_id=org.id
    )
    s.add_all([company_cp, org_cp])
    s.commit()
    try:
        resolved = resolve_custom_path(s, user)
        assert resolved is not None
        assert resolved.id == org_cp.id  # org > company
    finally:
        _cleanup_paths([company_cp, org_cp])


def test_direct_assignment_overrides_org_scope(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    org_cp = CustomPath(name="Org", scope=CustomPathScope.org, company_id=org.company_id, org_id=org.id)
    direct_cp = CustomPath(
        name="Directa", scope=CustomPathScope.company, company_id=org.company_id
    )
    s.add_all([org_cp, direct_cp])
    s.commit()
    s.add(CustomPathAssignment(org_id=org.id, custom_path_id=direct_cp.id, user_id=user.id))
    s.commit()
    try:
        resolved = resolve_custom_path(s, user)
        assert resolved is not None
        assert resolved.id == direct_cp.id  # asignación puntual > todo lo demás
    finally:
        s.execute(delete(CustomPathAssignment).where(CustomPathAssignment.user_id == user.id))
        s.commit()
        _cleanup_paths([org_cp, direct_cp])


def test_inactive_custom_path_is_ignored(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    cp = CustomPath(
        name="Inactiva", scope=CustomPathScope.company, company_id=org.company_id, is_active=False
    )
    s.add(cp)
    s.commit()
    try:
        assert resolve_custom_path(s, user) is None
    finally:
        _cleanup_paths([cp])


# ─────────────────────────── path_engine: coexisten, no reemplazan ───────────────────────────


def test_custom_path_items_prioritize_but_algorithm_fills_the_rest(factory) -> None:
    """3 units CP/L1 (u1,u2,u3, orden natural por unit_number). Custom path
    prioriza u3, el resto (u1,u2) los sigue trayendo el algoritmo — COEXISTEN,
    no se reemplaza la recomendación (decisión confirmada del plan)."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    units = [make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1) for _ in range(3)]
    for i, u in enumerate(units):
        u.pillar_code = "P1"
        u.unit_number = i + 1
    s.commit()
    cp = CustomPath(name="Prioriza u3", scope=CustomPathScope.org, company_id=org.company_id, org_id=org.id)
    s.add(cp)
    s.commit()
    s.add(CustomPathItem(custom_path_id=cp.id, learning_unit_id=units[2].id, order_index=0))
    s.commit()
    try:
        result = path_engine.build_path(s, user.id)
        assert result.custom_path_name == "Prioriza u3"
        seq_ids = [result.next_step.unit_id] + [st.unit_id for st in result.upcoming]
        assert seq_ids[0] == units[2].id  # la custom va primero
        assert set(seq_ids) == {u.id for u in units}  # el algoritmo trae el resto igual
    finally:
        s.execute(delete(CustomPathItem).where(CustomPathItem.custom_path_id == cp.id))
        s.commit()
        _cleanup_paths([cp])
        cleanup_units(s, [u.id for u in units])


def test_custom_path_completed_units_dont_block_the_rest(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    units = [make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1) for _ in range(2)]
    for i, u in enumerate(units):
        u.pillar_code = "P1"
        u.unit_number = i + 1
    s.commit()
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=units[0], when=datetime.now(UTC), completed=True)
    cp = CustomPath(name="Ya completada", scope=CustomPathScope.org, company_id=org.company_id, org_id=org.id)
    s.add(cp)
    s.commit()
    # La custom apunta a units[0] (ya completa) y units[1] (pendiente).
    s.add_all(
        [
            CustomPathItem(custom_path_id=cp.id, learning_unit_id=units[0].id, order_index=0),
            CustomPathItem(custom_path_id=cp.id, learning_unit_id=units[1].id, order_index=1),
        ]
    )
    s.commit()
    try:
        result = path_engine.build_path(s, user.id)
        # units[0] ya no está "pendiente" → no aparece en next_step/upcoming,
        # pero units[1] sigue recomendándose sin quedar bloqueada.
        assert result.next_step.unit_id == units[1].id
    finally:
        s.execute(delete(CustomPathItem).where(CustomPathItem.custom_path_id == cp.id))
        s.commit()
        _cleanup_paths([cp])
        cleanup_units(s, [u.id for u in units])


def test_no_custom_path_leaves_algorithm_untouched(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        result = path_engine.build_path(s, user.id)
        assert result.custom_path_name is None
        assert result.next_step.unit_id == unit.id
    finally:
        cleanup_units(s, [unit.id])
