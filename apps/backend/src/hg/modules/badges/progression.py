"""Progresión por dimensión: completion 0-100 + unlock de badges de nivel (TASK 6).

- **Completion** por ``(user, dimensión, nivel)`` = mezcla ponderada de
  **aprendizaje** (% de units del nivel completadas) + **assessment** (valor 0-100
  de la dimensión, ``scoring.py``). Pesos configurables por dimensión
  (``dimension_scoring_config``, default 0.70/0.30). Se persiste en
  ``dimension_level_progress`` y se recalcula al completar un bloque o derivar un
  ``DimensionResult``.
- **Unlock de nivel**: además de cruzar el ``unlock_threshold`` de aprendizaje+
  assessment, el badge de NIVEL requiere que el manager haya calificado
  "Demostrando" TODOS los comportamientos activos de la dimensión
  (``_manager_approved``) — el manager tiene la decisión final sobre si el
  colaborador aprueba la ruta, vía la matriz de comportamientos que ya existe
  (no una ponderación numérica: eso se eliminó, ver git history de FASE 1.1).
  Sin comportamientos activos definidos para la dimensión, el gate no aplica
  (no hay nada que el manager deba aprobar todavía). Idempotente y **conserva
  el máximo** (un badge ganado no se pierde si el completion baja después).

Los **sub-badges por pilar** (el "área de crecimiento" dentro de la dimensión) se
otorgan al completar todas las units publicadas de ese ``(dimensión, pilar)`` —
NO requieren aprobación del manager (son de contenido puro, no de "graduación"
de nivel). Su fila de catálogo la pre-seedea el sync de contenido
(``ensure_pillar_badge``), porque ``hg_app`` solo tiene SELECT sobre ``badges``.
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
from hg.modules.feedback.models import BehaviorEvaluation, PillarBehavior
from hg.modules.feedback.scoring import DEMOSTRANDO, rating_to_value
from hg.modules.identity.models import User
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt
from hg.modules.learning_units.pillars import pillar_display_name

# Ícono neutro para los badges cuyo arte definitivo todavía no existe. Vive en
# `apps/frontend/public/icons` — cuando llegue el arte real solo cambia el
# `icon_url` de la fila, no la UI (ver `components/ui/BadgeIcon.tsx`).
BADGE_PLACEHOLDER_ICON = "/icons/badge-placeholder.svg"

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


def _manager_pct(db: Session, user_id: UUID, dimension_code: str) -> float | None:
    """Valor 0-100 del feedback del manager para la dimensión: promedio del
    valor (rating→0/50/100) de la ÚLTIMA evaluación por comportamiento, sobre
    los ``pillar_behaviors`` activos de la dimensión que tengan al menos una
    evaluación del colaborador. Sin evaluaciones → ``None`` (se excluye del
    promedio ponderado, no se castiga con 0 a quien aún no fue evaluado)."""
    rows = db.execute(
        select(BehaviorEvaluation.behavior_id, BehaviorEvaluation.rating)
        .join(PillarBehavior, PillarBehavior.id == BehaviorEvaluation.behavior_id)
        .where(
            BehaviorEvaluation.user_id == user_id,
            PillarBehavior.dimension_code == dimension_code,
            PillarBehavior.is_active.is_(True),
        )
    ).all()
    if not rows:
        return None
    values = [v for r in rows if (v := rating_to_value(r.rating)) is not None]
    if not values:
        return None
    return round(sum(values) / len(values), 1)


def _manager_approved(db: Session, user_id: UUID, dimension_code: str) -> bool:
    """El manager tiene la decisión final: True solo si TODOS los
    ``pillar_behaviors`` activos de la dimensión están calificados
    "Demostrando" (rating=3) para este user. Sin comportamientos activos
    definidos → True (nada que aprobar todavía, no bloquea el badge por un
    catálogo vacío)."""
    active_ids = set(
        db.scalars(
            select(PillarBehavior.id).where(
                PillarBehavior.dimension_code == dimension_code,
                PillarBehavior.is_active.is_(True),
            )
        ).all()
    )
    if not active_ids:
        return True
    demonstrated_ids = set(
        db.scalars(
            select(BehaviorEvaluation.behavior_id).where(
                BehaviorEvaluation.user_id == user_id,
                BehaviorEvaluation.behavior_id.in_(active_ids),
                BehaviorEvaluation.rating == DEMOSTRANDO,
            )
        ).all()
    )
    return active_ids <= demonstrated_ids


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


def manager_pct_for_dimension(db: Session, user_id: UUID, dimension_code: str) -> float | None:
    """Wrapper público de ``_manager_pct`` (FASE 1.2 — el endpoint de la matriz
    lo usa para mostrar el promedio de comportamientos calificados sin tocar
    un símbolo privado). Ya no pesa en el completion — ver ``manager_approved_for_dimension``
    para el gate real de aprobación."""
    return _manager_pct(db, user_id, dimension_code.upper())


def manager_approved_for_dimension(db: Session, user_id: UUID, dimension_code: str) -> bool:
    """Wrapper público de ``_manager_approved`` — el endpoint de la matriz lo
    usa para mostrar el estado de aprobación del manager."""
    return _manager_approved(db, user_id, dimension_code.upper())


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
    m_pct = _manager_pct(db, user.id, dimension_code)
    approved = _manager_approved(db, user.id, dimension_code)

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
        # manager_pct queda de referencia (promedio de lo calificado) — ya NO
        # pesa en `completion_pct`. El gate real es `approved` (abajo).
        row.manager_pct = m_pct if m_pct is not None else 0.0

        if completion >= level.unlock_threshold and approved:
            _award_badge(db, user, f"level-{dimension_code}-{level.level_code}".lower())

    _award_pillar_badges(db, user, dimension_code)
    db.flush()


def pillar_badge_code(dimension_code: str, pillar_code: str) -> str:
    return f"pillar-{dimension_code}-{pillar_code}".lower()


def ensure_pillar_badge(
    db: Session, dimension_code: str, pillar_code: str, name: str | None = None
) -> None:
    """Upsert del Badge de catálogo de un pilar (idempotente). Lo llama el sync de
    contenido (superadmin, con INSERT en ``badges``); hg_app no puede crear acá —
    por eso el catálogo se pre-seedea desde el sync.

    El nombre visible sale de ``pillar_display_name`` (el área tal como se llama
    en la app, no ``CP · Pilar P1``). Se re-aplica en cada corrida para que el
    sync arrastre las correcciones del registro de nombres, pero **nunca pisa un
    ``icon_url`` ya cargado**: el arte definitivo se sube después y gana."""
    dimension_code = dimension_code.upper()
    code = pillar_badge_code(dimension_code, pillar_code)
    area_name = name or pillar_display_name(dimension_code, pillar_code)
    description = f"Completaste todas las unidades del área {area_name}."
    unlock_hint = f"Completá todas las unidades del área {area_name}."

    badge = db.scalar(select(Badge).where(Badge.code == code))
    if badge is None:
        db.add(
            Badge(
                code=code,
                name=area_name,
                description=description,
                icon_url=BADGE_PLACEHOLDER_ICON,
                unlock_hint=unlock_hint,
            )
        )
    else:
        badge.name = area_name
        badge.description = description
        badge.unlock_hint = unlock_hint
        if not badge.icon_url:
            badge.icon_url = BADGE_PLACEHOLDER_ICON
    db.flush()


def _award_pillar_badges(db: Session, user: User, dimension_code: str) -> None:
    """Otorga el sub-badge de cada pilar de la dimensión que el user completó
    (todas las units publicadas de ese ``(dimensión, pillar_code)``). El Badge
    de catálogo lo pre-seedea el sync (``ensure_pillar_badge``); acá solo se hace
    INSERT en user_badges (que hg_app sí puede)."""
    pillars = db.scalars(
        select(LearningUnit.pillar_code)
        .where(
            LearningUnit.dimension_code == dimension_code,
            LearningUnit.pillar_code.isnot(None),
            LearningUnit.published_at.isnot(None),
            LearningUnit.superseded_by_unit_id.is_(None),
        )
        .distinct()
    ).all()
    for pillar in pillars:
        if pillar is None:
            continue
        unit_ids = list(
            db.scalars(
                select(LearningUnit.id).where(
                    LearningUnit.dimension_code == dimension_code,
                    LearningUnit.pillar_code == pillar,
                    LearningUnit.published_at.isnot(None),
                    LearningUnit.superseded_by_unit_id.is_(None),
                )
            ).all()
        )
        if not unit_ids:
            continue
        completed = (
            db.scalar(
                select(func.count(func.distinct(LearningUnitAttempt.unit_id))).where(
                    LearningUnitAttempt.user_id == user.id,
                    LearningUnitAttempt.unit_id.in_(unit_ids),
                    LearningUnitAttempt.completed_at.isnot(None),
                )
            )
            or 0
        )
        if completed == len(unit_ids):  # pilar completo
            _award_badge(db, user, pillar_badge_code(dimension_code, pillar))


def recompute_for_assessment_code(db: Session, user: User, assessment_code: str) -> None:
    """Recalcula la dimensión de producto que corresponde a un código de assessment
    (para el hook al derivar un ``DimensionResult``)."""
    dim = dimension_for_assessment_code(assessment_code)
    if dim is not None:
        recompute_dimension(db, user, dim)


# ─────────────────────────── Lectura para el frontend (TASK 6 FE) ───────────────────────────


def progression_summary(db: Session, user_id: UUID) -> list[dict]:
    """Progreso por dimensión para el perfil: nivel actual + completion + niveles.

    El **nivel actual** es el primero cuyo completion no llegó al umbral (o el
    último si ya se ganaron todos). Devuelve dicts (los serializa el schema)."""
    levels = list(
        db.scalars(
            select(DimensionLevel).order_by(
                DimensionLevel.dimension_code, DimensionLevel.order_index
            )
        ).all()
    )
    progress = {
        (p.dimension_code, p.level_code): p
        for p in db.scalars(
            select(DimensionLevelProgress).where(DimensionLevelProgress.user_id == user_id)
        ).all()
    }

    by_dim: dict[str, list[DimensionLevel]] = {}
    for lvl in levels:
        by_dim.setdefault(lvl.dimension_code, []).append(lvl)

    out: list[dict] = []
    for dim, dim_levels in by_dim.items():
        level_rows = []
        current = None
        for lvl in dim_levels:
            row = progress.get((dim, lvl.level_code))
            completion = round(row.completion_pct, 1) if row is not None else 0.0
            earned = completion >= lvl.unlock_threshold
            level_rows.append(
                {"level_code": lvl.level_code, "name": lvl.name,
                 "completion_pct": completion, "unlock_threshold": lvl.unlock_threshold,
                 "earned": earned}
            )
            if current is None and not earned:
                current = level_rows[-1]
        # Todos ganados → el nivel actual es el último.
        current = current or (level_rows[-1] if level_rows else None)
        out.append({
            "dimension_code": dim,
            "current_level_code": current["level_code"] if current else None,
            "current_level_name": current["name"] if current else None,
            "current_completion_pct": current["completion_pct"] if current else 0.0,
            "current_unlock_threshold": current["unlock_threshold"] if current else 100,
            "levels": level_rows,
        })
    return out
