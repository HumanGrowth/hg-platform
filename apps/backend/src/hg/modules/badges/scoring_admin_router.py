"""Configuración de pesos del score + recompute masivo (FASE 1.4).

``DimensionScoringConfig`` es catálogo GLOBAL sin RLS (como ``badges``, ver
``badges/models.py``) — solo superadmin lo edita. Todo bajo
``get_db_as_superadmin`` (BYPASSRLS, cross-tenant) + ``require_role`` — mismo
patrón que ``admin/router.py`` / ``learning_units/admin_router.py``.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.assessment.scoring import PRODUCT_DIMENSIONS
from hg.modules.badges import progression
from hg.modules.badges.models import DimensionScoringConfig
from hg.modules.badges.schemas import (
    DimensionScoringConfigOut,
    RecomputeResultOut,
    UpdateScoringWeightsRequest,
)
from hg.modules.identity.models import User

router = APIRouter()


@router.get("/scoring-config", response_model=list[DimensionScoringConfigOut])
def list_scoring_config(
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> list[DimensionScoringConfigOut]:
    rows = {
        c.dimension_code: c
        for c in db.scalars(select(DimensionScoringConfig)).all()
    }
    return [
        DimensionScoringConfigOut(
            dimension_code=code,
            learning_weight=rows[code].learning_weight if code in rows else 0.7,
            assessment_weight=rows[code].assessment_weight if code in rows else 0.3,
            manager_weight=rows[code].manager_weight if code in rows else 0.0,
        )
        for code in PRODUCT_DIMENSIONS
    ]


@router.put("/scoring-config/{dimension_code}", response_model=DimensionScoringConfigOut)
def update_scoring_config(
    dimension_code: str,
    body: UpdateScoringWeightsRequest,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> DimensionScoringConfigOut:
    dimension_code = dimension_code.upper()
    if dimension_code not in PRODUCT_DIMENSIONS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="dimensión desconocida")
    cfg = db.get(DimensionScoringConfig, dimension_code)
    if cfg is None:
        cfg = DimensionScoringConfig(dimension_code=dimension_code)
        db.add(cfg)
    cfg.learning_weight = body.learning_weight
    cfg.assessment_weight = body.assessment_weight
    cfg.manager_weight = body.manager_weight
    db.flush()
    return DimensionScoringConfigOut(
        dimension_code=dimension_code,
        learning_weight=cfg.learning_weight,
        assessment_weight=cfg.assessment_weight,
        manager_weight=cfg.manager_weight,
    )


@router.post("/scoring-config/recompute", response_model=RecomputeResultOut)
def recompute_all(
    dimension_code: str | None = Query(default=None),
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> RecomputeResultOut:
    """Recalcula ``dimension_level_progress`` de TODOS los usuarios para una
    dimensión (o las 6, si no se especifica). Pensado para correr una vez
    después de cambiar pesos en FASE 1.4 — snapshot de Neon antes de invocarlo
    en producción (ver guardrails del plan)."""
    if dimension_code is not None:
        dimension_code = dimension_code.upper()
        if dimension_code not in PRODUCT_DIMENSIONS:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="dimensión desconocida")
        codes = [dimension_code]
    else:
        codes = list(PRODUCT_DIMENSIONS)

    users = list(db.scalars(select(User).where(User.is_active.is_(True))).all())
    for user in users:
        for code in codes:
            progression.recompute_dimension(db, user, code)
    db.flush()
    return RecomputeResultOut(dimension_codes=codes, users_recomputed=len(users))
