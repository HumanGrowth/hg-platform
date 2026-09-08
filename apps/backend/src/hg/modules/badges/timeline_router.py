"""Tu historia — línea de tiempo del recorrido del usuario (``GET /me/timeline``).

Reúne en un solo feed ordenado los eventos que cuentan el recorrido:

- ``diagnostic`` — cada ``DimensionResult`` derivado (el más viejo es el primer
  diagnóstico).
- ``dimension_started`` — el primer attempt del usuario en una dimensión.
- ``unit_completed`` — cada módulo terminado.
- ``badge`` — cada insignia desbloqueada (área, nivel o dimensión).

Existe porque ``recent_activity`` del dashboard está capado a los últimos 5
módulos tocados, y una historia necesita el recorrido entero. Todo scoped al
usuario del token (RLS por org + filtro ``user_id`` explícito).
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.assessment.service import latest_dimension_results
from hg.modules.badges.models import Badge, UserBadge
from hg.modules.identity.models import User
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.dimensions import career_path_for_dimension
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt

router = APIRouter()

TimelineKind = Literal["diagnostic", "dimension_started", "unit_completed", "badge"]


class TimelineEvent(BaseModel):
    kind: TimelineKind
    key: str
    """Estable y único por evento — el front lo usa como key de React."""
    at: datetime
    title: str
    subtitle: str | None = None
    # Dimensión Drive (CP/PR/…) cuando el evento pertenece a una.
    dimension_code: str | None = None
    career_path_code: str | None = None
    icon_url: str | None = None


@router.get("/timeline", response_model=list[TimelineEvent])
def my_timeline(
    limit: int = Query(default=60, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[TimelineEvent]:
    events: list[TimelineEvent] = []
    # Nombres de las 6 dimensiones (la tabla de career paths es la fuente).
    path_names = {p.code: p.name for p in db.scalars(select(CareerPath)).all()}

    # ── Diagnósticos y reevaluaciones ────────────────────────────────────
    results = sorted(latest_dimension_results(db, current_user.id), key=lambda r: r.derived_at)
    for i, r in enumerate(results):
        code = r.dimension_code.value
        cp = "P6" if code.startswith("P6") else code
        name = path_names.get(cp, cp)
        events.append(
            TimelineEvent(
                kind="diagnostic",
                key=f"result-{code}",
                at=r.derived_at,
                title="Tu primer diagnóstico" if i == 0 else f"Evaluaste {name}",
                subtitle=(
                    "Arrancaste tu recorrido en HumanGrowth." if i == 0 else r.state_label
                ),
                career_path_code=cp,
            )
        )

    # ── Módulos: primer attempt por dimensión + completados ──────────────
    rows = db.execute(
        select(LearningUnitAttempt, LearningUnit)
        .join(LearningUnit, LearningUnit.id == LearningUnitAttempt.unit_id)
        .where(LearningUnitAttempt.user_id == current_user.id)
        .order_by(LearningUnitAttempt.started_at.asc())
    ).all()

    first_in_dimension: dict[str, tuple[datetime, LearningUnit]] = {}
    for attempt, unit in rows:
        if attempt.started_at is not None and unit.dimension_code not in first_in_dimension:
            first_in_dimension[unit.dimension_code] = (attempt.started_at, unit)
        if attempt.completed_at is not None:
            events.append(
                TimelineEvent(
                    kind="unit_completed",
                    key=f"unit-{unit.id}",
                    at=attempt.completed_at,
                    title=f"Completaste “{unit.title}”",
                    subtitle=None,
                    dimension_code=unit.dimension_code,
                    career_path_code=career_path_for_dimension(unit.dimension_code),
                )
            )

    for dimension_code, (started_at, unit) in first_in_dimension.items():
        cp_code = career_path_for_dimension(dimension_code)
        events.append(
            TimelineEvent(
                kind="dimension_started",
                key=f"dim-start-{dimension_code}",
                at=started_at,
                title=f"Empezaste {path_names.get(cp_code or '', 'una dimensión nueva')}",
                subtitle=f"Tu primer módulo fue “{unit.title}”.",
                dimension_code=dimension_code,
                career_path_code=cp_code,
            )
        )

    # ── Insignias desbloqueadas ──────────────────────────────────────────
    badge_rows = db.execute(
        select(UserBadge, Badge)
        .join(Badge, Badge.id == UserBadge.badge_id)
        .where(UserBadge.user_id == current_user.id)
    ).all()
    for user_badge, badge in badge_rows:
        events.append(
            TimelineEvent(
                kind="badge",
                key=f"badge-{badge.code}",
                at=user_badge.unlocked_at,
                title=f"Desbloqueaste “{badge.name}”",
                subtitle=badge.description or None,
                icon_url=badge.icon_url or None,
            )
        )

    # Cronológico ascendente: la historia se lee como avance, y el front la
    # arranca desplazada al final (lo más reciente).
    events.sort(key=lambda e: e.at)
    return events[-limit:]
