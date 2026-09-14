"""Resolución de qué `CustomPath` aplica a un colaborador (FASE 2.2).

Precedencia (más específico gana): asignación puntual > `scope=org` > `scope=company`.
Si hay más de una ruta activa en el mismo nivel de precedencia (p.ej. 2 rutas
`scope=company` activas para la misma Empresa), v1 toma la más reciente
(`created_at` desc) — un solo ganador, simple y predecible; si Andy necesita
combinar varias, es un cambio de diseño explícito más adelante, no un default
silencioso acá.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.identity.models import User
from hg.modules.paths.models import (
    CustomPath,
    CustomPathAssignment,
    CustomPathItem,
    CustomPathScope,
)


def resolve_custom_path(db: Session, user: User) -> CustomPath | None:
    """La `CustomPath` aplicable a este user, o `None` si ninguna aplica."""
    via_assignment = db.scalar(
        select(CustomPath)
        .join(CustomPathAssignment, CustomPathAssignment.custom_path_id == CustomPath.id)
        .where(CustomPathAssignment.user_id == user.id, CustomPath.is_active.is_(True))
        .order_by(CustomPathAssignment.assigned_at.desc())
        .limit(1)
    )
    if via_assignment is not None:
        return via_assignment

    via_org = db.scalar(
        select(CustomPath)
        .where(
            CustomPath.scope == CustomPathScope.org,
            CustomPath.org_id == user.org_id,
            CustomPath.is_active.is_(True),
        )
        .order_by(CustomPath.created_at.desc())
        .limit(1)
    )
    if via_org is not None:
        return via_org

    return db.scalar(
        select(CustomPath)
        .where(
            CustomPath.scope == CustomPathScope.company,
            CustomPath.company_id == user.company_id,
            CustomPath.is_active.is_(True),
        )
        .order_by(CustomPath.created_at.desc())
        .limit(1)
    )


def custom_path_unit_order(db: Session, custom_path_id: uuid.UUID) -> list[uuid.UUID]:
    """``learning_unit_id`` de una ruta custom, en su orden configurado."""
    return list(
        db.scalars(
            select(CustomPathItem.learning_unit_id)
            .where(CustomPathItem.custom_path_id == custom_path_id)
            .order_by(CustomPathItem.order_index)
        ).all()
    )
