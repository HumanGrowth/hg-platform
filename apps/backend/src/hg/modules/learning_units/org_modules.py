"""Módulos por organización.

Una org tiene un set de módulos (`OrgModuleAssignment`). Asignar módulos a una
org (a) guarda esas filas y (b) materializa un `ModuleAssignment` para cada
miembro actual. Todo miembro que entre después (invitación, carga masiva,
cambio de org) recibe lo mismo vía `apply_org_modules`.

Corre bajo la sesión del caller (hg_superadmin en los flujos de admin/alta):
sólo `flush()`, nunca `commit()` (ver CLAUDE.md, invariante 2).
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.identity.models import User
from hg.modules.learning_units.area_access import (
    blocked_by_content_access,
    company_content_access,
    enabled_area_codes,
)
from hg.modules.learning_units.models import LearningUnit, ModuleAssignment, OrgModuleAssignment


def org_assignment_error(db: Session, company_id: UUID, units: list[LearningUnit]) -> str | None:
    """Por qué NO se pueden asignar ``units`` a una org de la Empresa (``None`` si
    se puede): Área no habilitada, dimensión/pilar deshabilitado o contenido que no
    es de Carrera. Fuente única de la regla: la usan el endpoint de asignación a
    org y el bulk de empresa."""
    enabled = enabled_area_codes(db, company_id)
    blocked = [u.slug for u in units if u.area_code is not None and u.area_code not in enabled]
    if blocked:
        return f"Área no habilitada para la empresa: {sorted(blocked)}"
    blocked_pillars = blocked_by_content_access(units, company_content_access(db, company_id))
    if blocked_pillars:
        return f"Contenido no habilitado para la empresa (dimensión o pilar): {blocked_pillars}"
    non_cp = [u.slug for u in units if u.dimension_code != "CP"]
    if non_cp:
        return f"Solo se puede asignar contenido de Carrera Profesional (CP): {sorted(non_cp)}"
    return None


def apply_org_modules(db: Session, user: User) -> int:
    """Crea los `ModuleAssignment` que le faltan a `user` según los módulos de
    su org. Idempotente. La fecha límite de la org solo se hereda si todavía es
    futura (un alta posterior no debe nacer vencida). Devuelve cuántos creó."""
    rules = list(
        db.scalars(
            select(OrgModuleAssignment).where(OrgModuleAssignment.org_id == user.org_id)
        ).all()
    )
    if not rules:
        return 0
    have = set(
        db.scalars(
            select(ModuleAssignment.learning_unit_id).where(ModuleAssignment.user_id == user.id)
        ).all()
    )
    now = datetime.now(UTC)
    created = [
        ModuleAssignment(
            org_id=user.org_id,
            user_id=user.id,
            learning_unit_id=r.learning_unit_id,
            assigned_by_user_id=r.assigned_by_user_id,
            due_date=r.due_date if r.due_date is not None and r.due_date > now else None,
            note=r.note,
        )
        for r in rules
        if r.learning_unit_id not in have
    ]
    db.add_all(created)
    db.flush()
    return len(created)


def upsert_org_modules(
    db: Session,
    *,
    org_id: UUID,
    unit_ids: list[UUID],
    assigned_by: UUID,
    due_date: datetime | None,
    note: str | None,
) -> int:
    """Registra los módulos de la org (los ya existentes se actualizan). Devuelve
    cuántos eran nuevos."""
    existing = {
        r.learning_unit_id: r
        for r in db.scalars(
            select(OrgModuleAssignment).where(OrgModuleAssignment.org_id == org_id)
        ).all()
    }
    new = 0
    for uid in dict.fromkeys(unit_ids):
        row = existing.get(uid)
        if row is None:
            db.add(
                OrgModuleAssignment(
                    org_id=org_id, learning_unit_id=uid, assigned_by_user_id=assigned_by,
                    due_date=due_date, note=note,
                )
            )
            new += 1
        else:
            row.due_date = due_date
            row.note = note
    db.flush()
    return new


def assign_units_to_active_members(
    db: Session,
    *,
    org_id: UUID,
    unit_ids: list[UUID],
    assigned_by: UUID,
    due_date: datetime | None,
    note: str | None,
) -> list[User]:
    """Materializa un `ModuleAssignment` para cada miembro ACTIVO actual de la org
    que aún no tenga esas units (aditivo). Los invitados los reciben al aceptar
    (`apply_org_modules`). Devuelve los miembros a los que se les creó algo."""
    members = list(
        db.scalars(select(User).where(User.org_id == org_id, User.is_active.is_(True))).all()
    )
    if not members or not unit_ids:
        return []
    already = set(
        db.execute(
            select(ModuleAssignment.user_id, ModuleAssignment.learning_unit_id).where(
                ModuleAssignment.user_id.in_([m.id for m in members]),
                ModuleAssignment.learning_unit_id.in_(unit_ids),
            )
        ).all()
    )
    created = [
        ModuleAssignment(
            org_id=org_id, user_id=m.id, learning_unit_id=uid,
            assigned_by_user_id=assigned_by, due_date=due_date, note=note,
        )
        for m in members
        for uid in unit_ids
        if (m.id, uid) not in already
    ]
    db.add_all(created)
    db.flush()
    touched = {a.user_id for a in created}
    return [m for m in members if m.id in touched]
