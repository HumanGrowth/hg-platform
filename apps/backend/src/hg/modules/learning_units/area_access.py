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

# Dimensiones gobernables por Empresa (códigos de dimensión de las units). Otras
# dimensiones del catálogo (p. ej. "ON", onboarding) no se gatean. Un PILAR es una
# sub-categoría DENTRO de una dimensión (`pillar_code`: P1..P5/AI en CP, V0..Vn en PR).
DIMENSION_CODES: tuple[str, ...] = ("CP", "PR", "RE", "SA", "PI", "ES")


def pillar_key(dimension_code: str, pillar_code: str) -> str:
    """Clave de un pilar deshabilitado: "<DIM>:<PILAR>" (p. ej. "CP:P3")."""
    return f"{dimension_code}:{pillar_code}"


def visible_units_predicate(user: User) -> ColumnElement[bool]:
    """Predicado SQL: la unit es visible si (es general o su Área está habilitada
    para la Empresa del ``user``) Y (su dimensión está habilitada) Y (su pilar no
    está deshabilitado). El superadmin no se filtra (ve todo el catálogo)."""
    if user.role == UserRole.superadmin:
        return true()
    enabled_areas = select(CompanyAreaAccess.area_code).where(
        CompanyAreaAccess.company_id == user.company_id
    )
    enabled_dimensions = select(func.unnest(Company.enabled_dimensions)).where(
        Company.id == user.company_id
    )
    disabled_pillars = select(func.unnest(Company.disabled_pillars)).where(
        Company.id == user.company_id
    )
    return and_(
        or_(
            LearningUnit.area_code.is_(None),
            LearningUnit.area_code.in_(enabled_areas),
        ),
        or_(
            LearningUnit.dimension_code.not_in(DIMENSION_CODES),
            LearningUnit.dimension_code.in_(enabled_dimensions),
        ),
        or_(
            LearningUnit.pillar_code.is_(None),
            func.concat(LearningUnit.dimension_code, ":", LearningUnit.pillar_code).not_in(
                disabled_pillars
            ),
        ),
    )


def unit_allowed(
    unit: LearningUnit,
    enabled_areas: set[str],
    enabled_dimensions: set[str],
    disabled_pillars: set[str],
) -> bool:
    """Regla ÚNICA de visibilidad (versión in-memory de ``visible_units_predicate``):
    (general o Área habilitada) Y (dimensión habilitada) Y (pilar no deshabilitado).
    Las dimensiones fuera de ``DIMENSION_CODES`` (p. ej. "ON") no se gatean."""
    if unit.area_code is not None and unit.area_code not in enabled_areas:
        return False
    return not _dimension_or_pillar_blocked(unit, enabled_dimensions, disabled_pillars)


def _dimension_or_pillar_blocked(
    unit: LearningUnit, enabled_dimensions: set[str], disabled_pillars: set[str]
) -> bool:
    if unit.dimension_code not in DIMENSION_CODES:
        return False
    if unit.dimension_code not in enabled_dimensions:
        return True
    return unit.pillar_code is not None and (
        pillar_key(unit.dimension_code, unit.pillar_code) in disabled_pillars
    )


def user_can_see_unit(db, user: User, unit: LearningUnit) -> bool:  # type: ignore[no-untyped-def]
    """Chequeo in-memory para una unit puntual: misma regla que el predicado SQL
    (Área + dimensión + pilar). Antes solo revisaba el Área (y nadie la llamaba)."""
    if user.role == UserRole.superadmin:
        return True
    dimensions, disabled = company_content_access(db, user.company_id)
    return unit_allowed(unit, enabled_area_codes(db, user.company_id), dimensions, disabled)


def enabled_area_codes(db, company_id) -> set[str]:  # type: ignore[no-untyped-def]
    """Áreas habilitadas para una Empresa (set de códigos)."""
    return set(
        db.scalars(
            select(CompanyAreaAccess.area_code).where(
                CompanyAreaAccess.company_id == company_id
            )
        ).all()
    )


def company_content_access(db, company_id) -> tuple[set[str], set[str]]:  # type: ignore[no-untyped-def]
    """(dimensiones habilitadas, pilares deshabilitados "<DIM>:<PILAR>") de una Empresa."""
    row = db.execute(
        select(Company.enabled_dimensions, Company.disabled_pillars).where(Company.id == company_id)
    ).first()
    if row is None:
        return set(DIMENSION_CODES), set()
    return set(row[0]), set(row[1])


def blocked_by_content_access(units, access: tuple[set[str], set[str]]) -> list[str]:  # type: ignore[no-untyped-def]
    """Slugs de las units cuya dimensión no está habilitada o cuyo pilar está
    deshabilitado (para validar asignaciones)."""
    dimensions, disabled = access
    return sorted(u.slug for u in units if _dimension_or_pillar_blocked(u, dimensions, disabled))
