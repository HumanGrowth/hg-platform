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
from hg.modules.learning_units.models import ModuleAssignment, OrgModuleAssignment


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
