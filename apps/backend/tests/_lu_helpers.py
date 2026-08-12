"""Helpers de seeding del modelo nuevo (Learning Units) para tests de métricas.

Reemplazan al viejo seeding de ``course_progress``: la actividad ahora se deriva
de ``learning_unit_attempts`` + ``block_progress`` (bloques completados).

Las units son catálogo GLOBAL (sin org_id) — igual que ``events``: hay que
borrarlas explícitamente en teardown (``cleanup_units``); attempts y
block_progress caen por CASCADE al borrar la unit.
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from hg.modules.learning_units.models import (
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
    UnitBlock,
    UnitBlockType,
)


def make_unit(
    s: Session,
    *,
    dimension_code: str = "CP",
    level_code: str = "L1",
    n_blocks: int = 1,
    published: bool = True,
    estimated_duration_seconds: int = 300,
) -> LearningUnit:
    """Crea una unit publicada con ``n_blocks`` bloques (templates text_context)."""
    unit = LearningUnit(
        slug=f"lu-{uuid4().hex[:12]}",
        title="Test Unit",
        dimension_code=dimension_code,
        level_code=level_code,
        published_at=datetime.now(UTC) if published else None,
        estimated_duration_seconds=estimated_duration_seconds,
    )
    s.add(unit)
    s.flush()
    for pos in range(n_blocks):
        s.add(
            UnitBlock(
                unit_id=unit.id,
                position=pos,
                block_type=UnitBlockType.text_context,
                block_id=uuid4(),  # FK polimórfico sin constraint
            )
        )
    s.commit()
    return unit


def seed_attempt(
    s: Session,
    *,
    org_id: UUID,
    user_id: UUID,
    unit: LearningUnit,
    when: datetime,
    completed: bool = False,
    completed_blocks: int | None = None,
) -> LearningUnitAttempt:
    """Crea un attempt + ``block_progress`` completados fechados en ``when``.

    ``completed_blocks``: cuántos bloques marcar completos (default = todos si
    ``completed`` else 1). El attempt queda ``completed_at=when`` si ``completed``.
    """
    blocks = list(
        s.scalars(
            select(UnitBlock)
            .where(UnitBlock.unit_id == unit.id)
            .order_by(UnitBlock.position)
        ).all()
    )
    n = completed_blocks if completed_blocks is not None else (len(blocks) if completed else 1)
    attempt = LearningUnitAttempt(
        user_id=user_id,
        unit_id=unit.id,
        org_id=org_id,
        started_at=when,
        completed_at=when if completed else None,
    )
    s.add(attempt)
    s.flush()
    for b in blocks[:n]:
        s.add(
            BlockProgress(
                attempt_id=attempt.id,
                unit_block_id=b.id,
                status=BlockProgressStatus.completed,
                submitted_at=when,
            )
        )
    s.commit()
    return attempt


def cleanup_units(s: Session, unit_ids: list[UUID]) -> None:
    """Borra las units creadas (CASCADE elimina blocks/attempts/block_progress)."""
    if unit_ids:
        s.execute(delete(LearningUnit).where(LearningUnit.id.in_(unit_ids)))
        s.commit()
