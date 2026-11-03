"""Cuándo una asignación de módulo está cumplida — única definición.

``ModuleAssignment.status`` nace en ``'assigned'`` y ningún flujo lo actualiza al
completar la unit, así que las lecturas (semáforo de vencidos del equipo, resumen
por organización, recordatorios de due date y el ``status`` que devuelve la API)
NO pueden fiarse de la columna. Una asignación está cumplida si el colaborador
tiene la unit completada (``LearningUnitAttempt.completed_at``) — sin importar si
la completó antes o después de que se la asignaran — o si la columna dice
``'completed'`` (compat con datos escritos a mano).

Ver docs del hallazgo H1 (mapa de conexiones).
"""
from __future__ import annotations

from collections.abc import Iterable
from uuid import UUID

from sqlalchemy import ColumnElement, exists, func, or_, select
from sqlalchemy.orm import Session, aliased

from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt, ModuleAssignment


def assignment_completed_clause() -> ColumnElement[bool]:
    """Predicado SQL sobre ``ModuleAssignment``: la asignación está cumplida.

    Correlacionado con la fila de ``module_assignments`` de la query externa.
    Una unit reemplazada (legacy) y su reemplazo son el mismo módulo: completar
    cualquiera de las dos cumple la asignación."""
    assigned = aliased(LearningUnit)
    attempted = aliased(LearningUnit)
    unit_done = exists().where(
        assigned.id == ModuleAssignment.learning_unit_id,
        LearningUnitAttempt.user_id == ModuleAssignment.user_id,
        LearningUnitAttempt.completed_at.is_not(None),
        attempted.id == LearningUnitAttempt.unit_id,
        func.coalesce(attempted.superseded_by_unit_id, attempted.id)
        == func.coalesce(assigned.superseded_by_unit_id, assigned.id),
    )
    return or_(ModuleAssignment.status == "completed", unit_done)


def completed_assignment_ids(db: Session, assignments: Iterable[ModuleAssignment]) -> set[UUID]:
    """IDs, entre ``assignments``, de las que están cumplidas."""
    ids = [a.id for a in assignments]
    if not ids:
        return set()
    return set(
        db.scalars(
            select(ModuleAssignment.id).where(
                ModuleAssignment.id.in_(ids), assignment_completed_clause()
            )
        ).all()
    )


def effective_status(stored_status: str, completed: bool) -> str:
    """Estado a exponer: 'completed' si está cumplida; si no, el guardado
    (``skipped`` se respeta: es una decisión explícita, no un dato derivable)."""
    if completed and stored_status != "skipped":
        return "completed"
    return stored_status
