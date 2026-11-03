"""Qué units completó un usuario, contando las legacy como completadas en su reemplazo.

Cuando una unit se reemplaza (``superseded_by_unit_id``, ver
``scripts/archive_and_purge_units``) el avance del usuario queda colgado del
``unit_id`` viejo, que la ruta ya no recorre. Decisión de producto: haber
completado la unit legacy cuenta como completada la unit nueva que la reemplaza.
Sólo cuenta lo COMPLETADO; un intento abierto sobre una legacy no se traslada.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt

_MAX_CHAIN = 10  # defensa ante ciclos en superseded_by_unit_id


def unit_successors(db: Session) -> dict[uuid.UUID, uuid.UUID]:
    """Por cada unit reemplazada, la unit vigente final que la reemplaza (sigue la
    cadena). Las units no reemplazadas no aparecen: su id ya es el canónico."""
    direct: dict[uuid.UUID, uuid.UUID] = {
        old_id: new_id
        for old_id, new_id in db.execute(
            select(LearningUnit.id, LearningUnit.superseded_by_unit_id).where(
                LearningUnit.superseded_by_unit_id.isnot(None)
            )
        ).all()
        if new_id is not None
    }
    final: dict[uuid.UUID, uuid.UUID] = {}
    for old_id, nxt in direct.items():
        for _ in range(_MAX_CHAIN):
            if nxt not in direct:
                break
            nxt = direct[nxt]
        final[old_id] = nxt
    return final


def canonical_unit_id(successors: dict[uuid.UUID, uuid.UUID], unit_id: uuid.UUID) -> uuid.UUID:
    """Id de la unit vigente equivalente: legacy y reemplazo son el mismo módulo
    (cambia solo el video), así que se cuentan, asignan y completan como uno."""
    return successors.get(unit_id, unit_id)


def completed_canonical_by_users(
    db: Session, user_ids: list[uuid.UUID]
) -> dict[uuid.UUID, set[uuid.UUID]]:
    """Units completadas por usuario, en ids canónicos y sin duplicar: completar la
    legacy y su reemplazo cuenta UNA vez. Única definición de "curso completado"
    para dashboard, CSV, progreso por cuenta y vista del usuario."""
    out: dict[uuid.UUID, set[uuid.UUID]] = {uid: set() for uid in user_ids}
    if not user_ids:
        return out
    successors = unit_successors(db)
    for uid, unit_id in db.execute(
        select(LearningUnitAttempt.user_id, LearningUnitAttempt.unit_id).where(
            LearningUnitAttempt.user_id.in_(user_ids), LearningUnitAttempt.completed_at.isnot(None)
        )
    ).all():
        out[uid].add(canonical_unit_id(successors, unit_id))
    return out


def completed_unit_ids(db: Session, user_id: uuid.UUID) -> set[uuid.UUID]:
    """Ids completados por el usuario, incluyendo el reemplazo de cada legacy
    completada (para recorrer la ruta, que trabaja con ids de units vigentes)."""
    done = set(
        db.scalars(
            select(LearningUnitAttempt.unit_id).where(
                LearningUnitAttempt.user_id == user_id, LearningUnitAttempt.completed_at.isnot(None)
            )
        ).all()
    )
    if not done:
        return done
    successors = unit_successors(db)
    return done | {successors[u] for u in done if u in successors}
