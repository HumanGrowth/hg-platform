"""Gating de contenido por Área para la Empresa del user (Capa Empresa · TASK 8).

Una ``LearningUnit`` es visible para un user si:
- es **general** (``area_code IS NULL``) — visible para todas las empresas, o
- su Área está **habilitada** para la Empresa del user (row en
  ``company_area_access``).

El superadmin HG ve todo (sin filtro). El predicado se usa en cualquier ``.where()``
que exponga units a un beta (feed, by-dimension, ruta, acceso directo).
"""
from __future__ import annotations

from sqlalchemy import ColumnElement, or_, select, true

from hg.modules.company.models import CompanyAreaAccess
from hg.modules.identity.models import User, UserRole
from hg.modules.learning_units.models import LearningUnit


def visible_units_predicate(user: User) -> ColumnElement[bool]:
    """Predicado SQL: la unit es general o su Área está habilitada para la Empresa
    del ``user``. El superadmin no se filtra (ve todo el catálogo)."""
    if user.role == UserRole.superadmin:
        return true()
    enabled_areas = select(CompanyAreaAccess.area_code).where(
        CompanyAreaAccess.company_id == user.company_id
    )
    return or_(
        LearningUnit.area_code.is_(None),
        LearningUnit.area_code.in_(enabled_areas),
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
