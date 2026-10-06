"""Gating de contenido por Área para la Empresa del user (Capa Empresa · TASK 8).

Una ``LearningUnit`` es visible para un user si:
- es **general** (``area_code IS NULL``) — visible para todas las empresas, o
- su Área está **habilitada** para la Empresa del user (row en
  ``company_area_access``).

El superadmin HG ve todo (sin filtro). El predicado se usa en cualquier ``.where()``
que exponga units a un beta (feed, by-dimension, ruta, acceso directo).
"""
from __future__ import annotations

from sqlalchemy import ColumnElement, and_, func, or_, select, true

from hg.modules.company.models import CompanyAreaAccess
from hg.modules.identity.models import Company, User, UserRole
from hg.modules.learning_units.models import LearningUnit

# Pilares gobernables por Empresa (códigos de dimensión de las units). Otras
# dimensiones del catálogo (p. ej. "ON", onboarding) no se gatean por pilar.
PILLAR_CODES: tuple[str, ...] = ("CP", "PR", "RE", "SA", "PI", "ES")


def visible_units_predicate(user: User) -> ColumnElement[bool]:
    """Predicado SQL: la unit es visible si (es general o su Área está habilitada
    para la Empresa del ``user``) Y (su pilar está habilitado para la Empresa).
    El superadmin no se filtra (ve todo el catálogo)."""
    if user.role == UserRole.superadmin:
        return true()
    enabled_areas = select(CompanyAreaAccess.area_code).where(
        CompanyAreaAccess.company_id == user.company_id
    )
    enabled_pillars = select(func.unnest(Company.enabled_pillars)).where(
        Company.id == user.company_id
    )
    return and_(
        or_(
            LearningUnit.area_code.is_(None),
            LearningUnit.area_code.in_(enabled_areas),
        ),
        or_(
            LearningUnit.dimension_code.not_in(PILLAR_CODES),
            LearningUnit.dimension_code.in_(enabled_pillars),
        ),
    )


def user_can_see_unit(user: User, unit: LearningUnit, enabled_areas: set[str]) -> bool:
    """Chequeo in-memory (acceso directo a una unit por slug). ``enabled_areas`` =
    Áreas habilitadas para la Empresa del user (vacío si ninguna)."""
    if user.role == UserRole.superadmin:
        return True
    return unit.area_code is None or unit.area_code in enabled_areas


def enabled_area_codes(db, company_id) -> set[str]:  # type: ignore[no-untyped-def]
    """Áreas habilitadas para una Empresa (set de códigos)."""
    return set(
        db.scalars(
            select(CompanyAreaAccess.area_code).where(
                CompanyAreaAccess.company_id == company_id
            )
        ).all()
    )


def enabled_pillar_codes(db, company_id) -> set[str]:  # type: ignore[no-untyped-def]
    """Pilares habilitados para una Empresa (set de códigos de dimensión)."""
    pillars = db.scalar(select(Company.enabled_pillars).where(Company.id == company_id))
    return set(pillars) if pillars is not None else set(PILLAR_CODES)


def blocked_by_pillar(units, enabled_pillars: set[str]) -> list[str]:  # type: ignore[no-untyped-def]
    """Slugs de las units cuyo pilar NO está habilitado (para validar asignaciones)."""
    return sorted(
        u.slug
        for u in units
        if u.dimension_code in PILLAR_CODES and u.dimension_code not in enabled_pillars
    )
