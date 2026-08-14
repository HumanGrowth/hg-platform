"""Progresión por dimensión: completion 0-100 + unlock de badges de nivel (TASK 6).

- **Completion** por ``(user, dimensión, nivel)`` = mezcla ponderada de
  **aprendizaje** (% de units del nivel completadas) + **assessment** (valor 0-100
  de la dimensión, ``scoring.py``). Pesos configurables por dimensión
  (``dimension_scoring_config``, default 0.70/0.30). Se persiste en
  ``dimension_level_progress`` y se recalcula al completar un bloque o derivar un
  ``DimensionResult``.
- **Unlock**: al cruzar el ``unlock_threshold`` de un nivel se otorga su badge
  (``UserBadge``). Idempotente y **conserva el máximo** (un badge ganado no se
  pierde si el completion baja tras una reevaluación).

Los **sub-badges por pilar** (6.3) quedan para un follow-up: requieren crear filas
de catálogo ``badges`` dinámicas y ``hg_app`` solo tiene SELECT sobre ``badges``
(las de nivel se pre-seedean en CE-04); además hoy solo la dimensión CP tiene
contenido de aprendizaje.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.assessment.models import DimensionResult
from hg.modules.assessment.scoring import (
    DIMENSION_TO_ASSESSMENT_CODES,
    dimension_value_from_states,
)
from hg.modules.badges.models import (
    Badge,
    DimensionLevel,
    DimensionLevelProgress,
    DimensionScoringConfig,
    UserBadge,
)
from hg.modules.identity.models import User
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt

# Reverso del mapeo dimensión→assessment (P1→CP, P6A/P6B→ES) para saber qué
# dimensión de producto recalcular cuando se deriva un DimensionResult.
_ASSESSMENT_TO_DIMENSION: dict[str, str] = {
    code: dim for dim, codes in DIMENSION_TO_ASSESSMENT_CODES.items() for code in codes
}


def dimension_for_assessment_code(assessment_code: str) -> str | None:
    """``P1``→``CP``, ``P6A``/``P6B``→``ES``. None si no mapea."""
    return _ASSESSMENT_TO_DIMENSION.get(assessment_code)


def _learning_pct(db: Session, user_id: UUID, dimension_code: str, level_code: str) -> float:
    """% de units publicadas de ``(dimensión, nivel)`` que el user completó
    (attempt.completed_at). Sin units en ese nivel → 0.0."""
    unit_ids = list(
        db.scalars(
            select(LearningUnit.id).where(
                LearningUnit.dimension_code == dimension_code,
                LearningUnit.level_code == level_code,
                LearningUnit.published_at.isnot(None),
                LearningUnit.superseded_by_unit_id.is_(None),
            )
        ).all()
    )
    if not unit_ids:
        return 0.0
    completed = (
        db.scalar(
            select(func.count(func.distinct(LearningUnitAttempt.unit_id))).where(
                LearningUnitAttempt.user_id == user_id,
                LearningUnitAttempt.unit_id.in_(unit_ids),
                LearningUnitAttempt.completed_at.isnot(None),
            )
        )
        or 0
    )
    return round(100.0 * completed / len(unit_ids), 1)


def _assessment_pct(db: Session, user_id: UUID, dimension_code: str) -> float:
    """Valor 0-100 de la dimensión desde el assessment (último estado por código;
    ES promedia P6A+P6B). Sin resultados → 0.0."""
    codes = DIMENSION_TO_ASSESSMENT_CODES.get(dimension_code, [])
    states: list[str | None] = []
    for code in codes:
        state = db.scalar(
            select(DimensionResult.state_code)
            .where(
                DimensionResult.user_id == user_id,
                DimensionResult.dimension_code == code,
            )
            .order_by(DimensionResult.derived_at.desc())
            .limit(1)
        )
        if state is not None:
            states.append(state)
    return dimension_value_from_states(states)


def _weights(db: Session, dimension_code: str) -> tuple[float, float]:
    cfg = db.get(DimensionScoringConfig, dimension_code)
    if cfg is None:
        return 0.7, 0.3
    return cfg.learning_weight, cfg.assessment_weight


def _award_badge(db: Session, user: User, badge_code: str) -> None:
    """Otorga (idempotente) el badge de catálogo ``badge_code`` al user. Conserva
    el máximo: si ya lo tiene, no hace nada (no se revoca)."""
    badge = db.scalar(select(Badge).where(Badge.code == badge_code))
    if badge is None:
        return
    exists = db.scalar(
        select(UserBadge.id).where(
            UserBadge.user_id == user.id, UserBadge.badge_id == badge.id
        )
    )
    if exists is not None:
        return
    db.add(UserBadge(org_id=user.org_id, user_id=user.id, badge_id=badge.id))
    db.flush()


def recompute_dimension(db: Session, user: User, dimension_code: str) -> None:
    """Recalcula el completion de todos los niveles de una dimensión para el user,
    persiste ``dimension_level_progress`` y otorga los badges de nivel alcanzados."""
    dimension_code = dimension_code.upper()
    levels = list(
        db.scalars(
            select(DimensionLevel)
            .where(DimensionLevel.dimension_code == dimension_code)
            .order_by(DimensionLevel.order_index)
        ).all()
    )
    if not levels:
        return

    lw, aw = _weights(db, dimension_code)
    a_pct = _assessment_pct(db, user.id, dimension_code)

    for level in levels:
        l_pct = _learning_pct(db, user.id, dimension_code, level.level_code)
        weight_sum = lw + aw
        completion = round((lw * l_pct + aw * a_pct) / weight_sum, 1) if weight_sum else 0.0

        row = db.scalar(
            select(DimensionLevelProgress).where(
                DimensionLevelProgress.user_id == user.id,
                DimensionLevelProgress.dimension_code == dimension_code,
                DimensionLevelProgress.level_code == level.level_code,
            )
        )
        if row is None:
            row = DimensionLevelProgress(
                org_id=user.org_id, user_id=user.id,
                dimension_code=dimension_code, level_code=level.level_code,
            )
            db.add(row)
        row.completion_pct = completion
        row.learning_pct = l_pct
        row.assessment_pct = a_pct

        if completion >= level.unlock_threshold:
            _award_badge(db, user, f"level-{dimension_code}-{level.level_code}".lower())

    db.flush()


def recompute_for_assessment_code(db: Session, user: User, assessment_code: str) -> None:
    """Recalcula la dimensión de producto que corresponde a un código de assessment
    (para el hook al derivar un ``DimensionResult``)."""
    dim = dimension_for_assessment_code(assessment_code)
    if dim is not None:
        recompute_dimension(db, user, dim)
