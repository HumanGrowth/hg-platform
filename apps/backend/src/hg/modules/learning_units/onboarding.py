"""Onboarding de contenido: dimensión "capa 0" + restricción de acceso.

Un colaborador/manager que TODAVÍA no recibió ninguna asignación de su
organización o Empresa (``ModuleAssignment`` puntual/masiva — FASE 2.1 — o una
``CustomPath`` aplicable — FASE 2.2) solo puede ver/consumir units de la
dimensión ``ONBOARDING_DIMENSION_CODE`` ("ON"). En cuanto recibe su primera
asignación, la restricción se levanta automáticamente (no hay una columna que
lo marque — se deriva en cada request, así nunca queda desincronizado con la
realidad de asignaciones).

"ON" es una dimensión de **catálogo** más (mismo campo libre `dimension_code`
que CP/PR/RE/SA/PI/ES) pero deliberadamente NO participa del motor de score
(`badges/progression.py` solo itera `PRODUCT_DIMENSIONS`), ni del mapeo
Drive↔career_path (`learning_units/dimensions.py`), ni de `path_engine.build_path`
(que la excluye explícitamente) — es un track aparte, sin niveles/pilares/
badges, que se agota una sola vez al principio.

admin/company_admin/superadmin NUNCA están restringidos: operan la plataforma,
no son colaboradores nuevos pasando por onboarding.
"""
from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.identity.models import User, UserRole
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt, ModuleAssignment
from hg.modules.paths.resolution import resolve_custom_path

ONBOARDING_DIMENSION_CODE = "ON"

_RESTRICTED_ROLES = {UserRole.collaborator, UserRole.manager}


def has_been_assigned_content(db: Session, user: User) -> bool:
    """True si la organización/Empresa del user ya le asignó algo — puntual
    (``ModuleAssignment``, incluye lo materializado por la asignación a nivel
    organización de FASE 2.1) o por alcance de una ``CustomPath`` (FASE 2.2,
    org/company/asignación directa). Es la señal que gradúa a un colaborador
    nuevo fuera de la restricción de onboarding."""
    has_assignment = (
        db.scalar(select(ModuleAssignment.id).where(ModuleAssignment.user_id == user.id).limit(1))
        is not None
    )
    if has_assignment:
        return True
    return resolve_custom_path(db, user) is not None


def is_content_restricted(db: Session, user: User) -> bool:
    """True si el user solo puede ver contenido de la dimensión Onboarding."""
    if user.role not in _RESTRICTED_ROLES:
        return False
    return not has_been_assigned_content(db, user)


@dataclass
class OnboardingUnit:
    unit_id: UUID
    slug: str
    title: str
    estimated_minutes: int | None
    completed: bool


@dataclass
class OnboardingStatus:
    is_restricted: bool
    units: list[OnboardingUnit]
    completed_count: int
    total_count: int
    all_completed: bool


def build_onboarding_status(db: Session, user: User) -> OnboardingStatus:
    """Units publicadas de la dimensión Onboarding (orden por `unit_number`,
    convención del Drive) + progreso del user + si sigue restringido."""
    units = list(
        db.scalars(
            select(LearningUnit)
            .where(
                LearningUnit.dimension_code == ONBOARDING_DIMENSION_CODE,
                LearningUnit.published_at.isnot(None),
                LearningUnit.superseded_by_unit_id.is_(None),
            )
            .order_by(LearningUnit.unit_number.asc())
        ).all()
    )
    completed_ids = set(
        db.scalars(
            select(LearningUnitAttempt.unit_id).where(
                LearningUnitAttempt.user_id == user.id,
                LearningUnitAttempt.unit_id.in_([u.id for u in units]),
                LearningUnitAttempt.completed_at.isnot(None),
            )
        ).all()
        if units
        else []
    )
    out_units = [
        OnboardingUnit(
            unit_id=u.id,
            slug=u.slug,
            title=u.title,
            estimated_minutes=(
                round(u.estimated_duration_seconds / 60) if u.estimated_duration_seconds else None
            ),
            completed=u.id in completed_ids,
        )
        for u in units
    ]
    completed_count = len(completed_ids)
    total_count = len(units)
    return OnboardingStatus(
        is_restricted=is_content_restricted(db, user),
        units=out_units,
        completed_count=completed_count,
        total_count=total_count,
        all_completed=total_count > 0 and completed_count == total_count,
    )
