"""Matriz de comportamientos + evaluación del manager (FASE 1.2).

- ``GET /admin/users/{user_id}/behavior-matrix``: comportamientos del pilar en
  curso del colaborador (+ contexto del resto de pilares de esa dimensión),
  cada uno con su última evaluación si existe.
- ``PUT /admin/users/{user_id}/behavior-evaluations``: upsert batch de
  calificaciones 1..3. Dispara ``recompute_dimension`` para la dimensión
  evaluada. Solo manager (sobre sus reportes) o admin/superadmin — mismo scope
  que VER (ver ``_authorize_manage_target``: ``company_admin`` queda afuera de
  esta v1, cross-org read-only queda pendiente de decisión + un segundo patrón
  de sesión).
- ``GET /me/behavior-feedback``: el colaborador ve SUS calificaciones
  (read-only, sin notas del manager — privadas por default hasta confirmar
  decisión abierta #3 del plan).

Reusa el patrón de autorización de ``learning_units/assignments_router.py``
(``_authorize_manage_target``). Regla DB: ``flush()``, nunca ``commit()`` a
mitad de handler (``get_db`` commitea al cerrar el request).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.badges import progression
from hg.modules.badges.models import DimensionScoringConfig
from hg.modules.feedback.models import BehaviorEvaluation, PillarBehavior
from hg.modules.feedback.schemas import (
    BehaviorMatrixOut,
    BehaviorOut,
    MyBehaviorEvaluationOut,
    PillarBehaviorsOut,
    UpsertBehaviorEvaluationsRequest,
)
from hg.modules.identity.models import User, UserRole
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units import path_engine
from hg.modules.learning_units.dimensions import career_path_for_dimension
from hg.modules.learning_units.pillars import pillar_display_name

admin_router = APIRouter()
me_router = APIRouter()

_EVALUATE_ROLES = {UserRole.manager, UserRole.admin, UserRole.superadmin}
_ADMIN_ROLES = {UserRole.admin, UserRole.superadmin}
_DEFAULT_DIMENSION = "CP"  # sin next_step (ruta completa / sin contenido aún)


def _authorize_manage_target(db: Session, current_user: User, user_id: UUID) -> User:
    """Puede VER y CALIFICAR: manager sobre sus reportes, o admin/superadmin
    sobre su org (RLS). Mismo patrón que
    ``assignments_router._authorize_manage_target``.

    ``company_admin`` NO está incluido todavía: este endpoint corre bajo
    ``get_db`` (RLS por org del token), y ver/calificar colaboradores de OTRAS
    orgs de la misma Empresa requeriría el patrón cross-tenant de
    ``company/router.py`` (``get_db_as_superadmin`` + scoping explícito por
    ``company_id``), que esta v1 no implementa. Ver decisión abierta #4 del
    plan — confirmar con Andy si RRHH debe poder LEER (nunca calificar) la
    matriz cross-org antes de cablear ese segundo patrón de sesión."""
    if current_user.role not in _EVALUATE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role")
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if current_user.role in _ADMIN_ROLES or target.manager_id == current_user.id:
        return target
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")


def _current_dimension_and_pillar(db: Session, user_id: UUID) -> tuple[str, str | None]:
    """Dimensión/pilar EN CURSO del colaborador, vía ``path_engine.build_path``
    (``next_step``). Sin próximo paso (ruta completa, o sin contenido todavía)
    cae a ``_DEFAULT_DIMENSION`` sin pilar destacado."""
    result = path_engine.build_path(db, user_id)
    if result.next_step is not None:
        return result.next_step.dimension_code, result.next_step.pillar_code
    return _DEFAULT_DIMENSION, None


@admin_router.get("/users/{user_id}/behavior-matrix", response_model=BehaviorMatrixOut)
def get_behavior_matrix(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BehaviorMatrixOut:
    target = _authorize_manage_target(db, current_user, user_id)
    dimension_code, current_pillar_code = _current_dimension_and_pillar(db, target.id)

    behaviors = list(
        db.scalars(
            select(PillarBehavior)
            .where(
                PillarBehavior.dimension_code == dimension_code,
                PillarBehavior.is_active.is_(True),
            )
            .order_by(PillarBehavior.pillar_code, PillarBehavior.order_index)
        ).all()
    )
    behavior_ids = [b.id for b in behaviors]
    evaluations = {
        e.behavior_id: e
        for e in (
            db.scalars(
                select(BehaviorEvaluation).where(
                    BehaviorEvaluation.user_id == target.id,
                    BehaviorEvaluation.behavior_id.in_(behavior_ids),
                )
            ).all()
            if behavior_ids
            else []
        )
    }
    evaluator_ids = {e.evaluated_by_user_id for e in evaluations.values() if e.evaluated_by_user_id}
    evaluator_names = {
        u.id: u.full_name
        for u in (db.scalars(select(User).where(User.id.in_(evaluator_ids))).all() if evaluator_ids else [])
    }

    def _behavior_out(b: PillarBehavior) -> BehaviorOut:
        ev = evaluations.get(b.id)
        return BehaviorOut(
            behavior_id=b.id,
            text=b.text,
            order_index=b.order_index,
            rating=ev.rating if ev else None,
            updated_at=ev.updated_at if ev else None,
            evaluated_by_name=(
                evaluator_names.get(ev.evaluated_by_user_id) if ev and ev.evaluated_by_user_id else None
            ),
        )

    by_pillar: dict[str, list[PillarBehavior]] = {}
    for b in behaviors:
        by_pillar.setdefault(b.pillar_code, []).append(b)

    pillars_out = [
        PillarBehaviorsOut(
            pillar_code=pillar_code,
            pillar_name=pillar_display_name(dimension_code, pillar_code),
            is_current=pillar_code == current_pillar_code,
            behaviors=[_behavior_out(b) for b in pillar_behaviors],
        )
        for pillar_code, pillar_behaviors in by_pillar.items()
    ]
    # Pilar en curso primero, después el resto en su orden natural (contexto).
    pillars_out.sort(key=lambda p: (0 if p.is_current else 1, p.pillar_code))

    cfg = db.get(DimensionScoringConfig, dimension_code)
    manager_pct = progression.manager_pct_for_dimension(db, target.id, dimension_code)
    career_path_code = career_path_for_dimension(dimension_code)
    career_path = (
        db.scalar(select(CareerPath).where(CareerPath.code == career_path_code))
        if career_path_code
        else None
    )

    return BehaviorMatrixOut(
        dimension_code=dimension_code,
        dimension_name=career_path.name if career_path else dimension_code,
        current_pillar_code=current_pillar_code,
        pillars=pillars_out,
        manager_pct=manager_pct,
        manager_weight=cfg.manager_weight if cfg else 0.0,
        learning_weight=cfg.learning_weight if cfg else 0.7,
        assessment_weight=cfg.assessment_weight if cfg else 0.3,
    )


@admin_router.put("/users/{user_id}/behavior-evaluations", response_model=BehaviorMatrixOut)
def upsert_behavior_evaluations(
    user_id: UUID,
    body: UpsertBehaviorEvaluationsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BehaviorMatrixOut:
    target = _authorize_manage_target(db, current_user, user_id)

    behavior_ids = [item.behavior_id for item in body.evaluations]
    behaviors = {
        b.id: b
        for b in db.scalars(
            select(PillarBehavior).where(
                PillarBehavior.id.in_(behavior_ids), PillarBehavior.is_active.is_(True)
            )
        ).all()
    }
    missing = set(behavior_ids) - set(behaviors)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"comportamientos inexistentes o inactivos: {sorted(str(m) for m in missing)}",
        )

    existing = {
        e.behavior_id: e
        for e in db.scalars(
            select(BehaviorEvaluation).where(
                BehaviorEvaluation.user_id == target.id,
                BehaviorEvaluation.behavior_id.in_(behavior_ids),
            )
        ).all()
    }
    dimensions_to_recompute: set[str] = set()
    for item in body.evaluations:
        row = existing.get(item.behavior_id)
        if row is None:
            row = BehaviorEvaluation(
                org_id=target.org_id, user_id=target.id, behavior_id=item.behavior_id,
                rating=item.rating, note=item.note, evaluated_by_user_id=current_user.id,
            )
            db.add(row)
        else:
            row.rating = item.rating
            row.note = item.note
            row.evaluated_by_user_id = current_user.id
        dimensions_to_recompute.add(behaviors[item.behavior_id].dimension_code)
    db.flush()

    for dim in dimensions_to_recompute:
        progression.recompute_dimension(db, target, dim)
    db.flush()

    return get_behavior_matrix(user_id, db, current_user)


@me_router.get("/behavior-feedback", response_model=list[MyBehaviorEvaluationOut])
def my_behavior_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MyBehaviorEvaluationOut]:
    """El colaborador ve SUS calificaciones (transparencia sobre el efecto en
    su score) — sin las notas del manager, privadas por default. Decisión
    abierta #3 del plan: confirmar si esto debe existir/mostrarse así."""
    rows = db.execute(
        select(BehaviorEvaluation, PillarBehavior)
        .join(PillarBehavior, PillarBehavior.id == BehaviorEvaluation.behavior_id)
        .where(BehaviorEvaluation.user_id == current_user.id)
    ).all()
    return [
        MyBehaviorEvaluationOut(
            behavior_id=b.id, dimension_code=b.dimension_code, pillar_code=b.pillar_code,
            text=b.text, rating=e.rating, updated_at=e.updated_at,
        )
        for e, b in rows
    ]
