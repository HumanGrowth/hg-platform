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


def completed_unit_ids(db: Session, user_id: uuid.UUID) -> set[uuid.UUID]:
    done = set(
        db.scalars(
            select(LearningUnitAttempt.unit_id).where(
                LearningUnitAttempt.user_id == user_id, LearningUnitAttempt.completed_at.isnot(None)
            )
        ).all()
    )
    if not done:
        return done
    successor: dict[uuid.UUID, uuid.UUID] = {
        old_id: new_id
        for old_id, new_id in db.execute(
            select(LearningUnit.id, LearningUnit.superseded_by_unit_id).where(
                LearningUnit.superseded_by_unit_id.isnot(None)
            )
        ).all()
        if new_id is not None
    }
    result = set(done)
    for unit_id in done:
        for _ in range(_MAX_CHAIN):
            nxt = successor.get(unit_id)
            if nxt is None:
                break
            result.add(nxt)
            unit_id = nxt
    return result
