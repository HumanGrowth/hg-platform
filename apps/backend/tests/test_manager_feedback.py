"""FASE 1.1 + corrección post-1.4: matriz de comportamientos + feedback del
manager como gate de aprobación del badge de nivel (no ponderación numérica).
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select, text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session

from hg.modules.assessment.enums import DimensionCode, ResultSource
from hg.modules.assessment.models import DimensionResult
from hg.modules.badges import progression
from hg.modules.badges.models import Badge, DimensionLevelProgress, UserBadge
from hg.modules.feedback.models import BehaviorEvaluation, PillarBehavior
from hg.modules.feedback.scoring import rating_to_value
from hg.modules.identity.models import Company, Organization, User

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


def _seed_full_assessment(s: Session, user) -> None:
    """Assessment P1=L6 (valor 100) para que el completion CP/L1 cruce el
    threshold sin depender del catálogo real de contenido."""
    now = datetime.now(UTC)
    s.add(
        DimensionResult(
            org_id=user.org_id, user_id=user.id, dimension_code=DimensionCode.P1,
            source=ResultSource.preliminary, state_code="L6", state_label="L6",
            sub_scores={}, derived_at=now, next_retake_eligible_at=now,
        )
    )
    s.commit()


def _make_behaviors(s: Session, *, dimension_code: str = "CP", pillar_code: str = "ZZ", n: int = 3):
    # pillar_code "ZZ" es ficticio a propósito: evita colisionar con el seed
    # real de CE-10 (CP/P1..P5, order_index 0..2) en el unique constraint
    # (dimension_code, pillar_code, order_index). _manager_pct no filtra por
    # pilar — promedia todos los comportamientos activos de la dimensión.
    rows = [
        PillarBehavior(dimension_code=dimension_code, pillar_code=pillar_code,
                        text=f"Comportamiento {i}", order_index=i)
        for i in range(n)
    ]
    s.add_all(rows)
    s.commit()
    return rows


def _evaluate(s: Session, *, user_id, behavior_id, rating: int, evaluated_by=None):
    row = BehaviorEvaluation(
        org_id=s.get(User, user_id).org_id, user_id=user_id, behavior_id=behavior_id,
        rating=rating, evaluated_by_user_id=evaluated_by,
    )
    s.add(row)
    s.commit()
    return row


def _cleanup(s: Session, *, user_ids: list, behavior_ids: list) -> None:
    s.execute(delete(BehaviorEvaluation).where(BehaviorEvaluation.user_id.in_(user_ids)))
    s.execute(delete(PillarBehavior).where(PillarBehavior.id.in_(behavior_ids)))
    s.commit()


# ─────────────────────────── scoring puro ───────────────────────────


def test_rating_to_value() -> None:
    assert rating_to_value(1) == 0.0
    assert rating_to_value(2) == 50.0
    assert rating_to_value(3) == 100.0
    assert rating_to_value(None) is None


# ─────────────────────────── _manager_pct ───────────────────────────


def test_manager_pct_none_without_evaluations(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    behaviors = _make_behaviors(s)
    try:
        assert progression._manager_pct(s, user.id, "CP") is None
    finally:
        _cleanup(s, user_ids=[user.id], behavior_ids=[b.id for b in behaviors])


def test_manager_pct_averages_last_rating_per_behavior(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    mgr = factory.make_user(org=org)
    behaviors = _make_behaviors(s, n=3)
    try:
        _evaluate(s, user_id=user.id, behavior_id=behaviors[0].id, rating=1, evaluated_by=mgr.id)
        _evaluate(s, user_id=user.id, behavior_id=behaviors[1].id, rating=3, evaluated_by=mgr.id)
        # Solo 2 de 3 comportamientos evaluados → promedio de (0, 100) = 50.
        assert progression._manager_pct(s, user.id, "CP") == 50.0

        # Upsert: sube la 1ra a "demostrando" → promedio (100, 100) = 100.
        s.execute(
            BehaviorEvaluation.__table__.update()
            .where(BehaviorEvaluation.user_id == user.id, BehaviorEvaluation.behavior_id == behaviors[0].id)
            .values(rating=3)
        )
        s.commit()
        assert progression._manager_pct(s, user.id, "CP") == 100.0
    finally:
        _cleanup(s, user_ids=[user.id], behavior_ids=[b.id for b in behaviors])


def test_manager_pct_ignores_inactive_behaviors(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    behaviors = _make_behaviors(s, n=1)
    behaviors[0].is_active = False
    s.commit()
    try:
        _evaluate(s, user_id=user.id, behavior_id=behaviors[0].id, rating=3)
        assert progression._manager_pct(s, user.id, "CP") is None
    finally:
        _cleanup(s, user_ids=[user.id], behavior_ids=[b.id for b in behaviors])


# ─────────────────────────── recompute_dimension: el manager es un gate, no un peso ───────────────────────────


def test_manager_evaluations_never_move_completion_pct(factory) -> None:
    """El feedback del manager NO entra al cálculo numérico del completion —
    calificar comportamientos no debería mover ``completion_pct``, evaluado o
    no, "Sin demostrar" o "Demostrando"."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    behaviors = _make_behaviors(s, n=2)
    try:
        l_pct = progression._learning_pct(s, user.id, "CP", "L1")
        a_pct = progression._assessment_pct(s, user.id, "CP")
        lw, aw = progression._weights(s, "CP")
        expected = round((lw * l_pct + aw * a_pct) / (lw + aw), 1)

        progression.recompute_dimension(s, user, "CP")
        s.commit()
        row = s.scalar(
            select(DimensionLevelProgress).where(
                DimensionLevelProgress.user_id == user.id,
                DimensionLevelProgress.dimension_code == "CP",
                DimensionLevelProgress.level_code == "L1",
            )
        )
        assert row.completion_pct == expected

        _evaluate(s, user_id=user.id, behavior_id=behaviors[0].id, rating=1)
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        s.refresh(row)
        assert row.completion_pct == expected  # "Sin demostrar" tampoco mueve nada

        _evaluate(s, user_id=user.id, behavior_id=behaviors[1].id, rating=3)
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        s.refresh(row)
        assert row.completion_pct == expected  # "Demostrando" tampoco
    finally:
        _cleanup(s, user_ids=[user.id], behavior_ids=[b.id for b in behaviors])
        cleanup_units(s, [unit.id])


def test_manager_approval_gates_level_badge(factory) -> None:
    """El badge de nivel solo se otorga si completion cruza el threshold Y el
    manager calificó "Demostrando" TODOS los comportamientos activos de la
    dimensión. Falta la aprobación → sin badge aunque el completion sea 100."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    _seed_full_assessment(s, user)
    behaviors = _make_behaviors(s, n=2)
    badge = s.scalar(select(Badge).where(Badge.code == "level-cp-l1"))
    assert badge is not None

    def _has_badge() -> bool:
        return (
            s.scalar(
                select(func.count()).select_from(UserBadge).where(
                    UserBadge.user_id == user.id, UserBadge.badge_id == badge.id
                )
            )
            == 1
        )

    try:
        assert progression.manager_approved_for_dimension(s, user.id, "CP") is False

        # Completion cruza el threshold (fixture: L1 solo tiene esta unit), pero
        # el catálogo real de CP (CE-10) sigue sin aprobar → sin badge.
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        assert _has_badge() is False

        # Aprueba los comportamientos ficticios de este test pero NO los reales
        # de CE-10 → sigue sin aprobar (el gate exige TODOS los activos).
        _evaluate(s, user_id=user.id, behavior_id=behaviors[0].id, rating=3)
        _evaluate(s, user_id=user.id, behavior_id=behaviors[1].id, rating=3)
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        assert _has_badge() is False

        # Aprueba también el catálogo real de CP → ahora sí, gate cumplido.
        real_behavior_ids = s.scalars(
            select(PillarBehavior.id).where(
                PillarBehavior.dimension_code == "CP",
                PillarBehavior.is_active.is_(True),
                PillarBehavior.id.notin_([b.id for b in behaviors]),
            )
        ).all()
        for behavior_id in real_behavior_ids:
            _evaluate(s, user_id=user.id, behavior_id=behavior_id, rating=3)
        assert progression.manager_approved_for_dimension(s, user.id, "CP") is True

        progression.recompute_dimension(s, user, "CP")
        s.commit()
        assert _has_badge() is True
    finally:
        s.query(UserBadge).filter(UserBadge.user_id == user.id).delete()
        s.query(BehaviorEvaluation).filter(BehaviorEvaluation.user_id == user.id).delete()
        s.query(DimensionResult).filter(DimensionResult.user_id == user.id).delete()
        s.commit()
        _cleanup(s, user_ids=[user.id], behavior_ids=[b.id for b in behaviors])
        cleanup_units(s, [unit.id])


def test_manager_approval_true_when_no_behaviors_defined(factory) -> None:
    """Sin comportamientos activos definidos para la dimensión, el gate no
    bloquea (nada que el manager deba aprobar todavía)."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    assert progression.manager_approved_for_dimension(s, user.id, "PR") is True


# ─────────────────────────── RLS: behavior_evaluations aisla por org ───────────────────────────


def _bootstrap_two_orgs_with_users(db: Session):
    co_a = Company(name="Co A", slug=f"c-{uuid4().hex[:10]}")
    co_b = Company(name="Co B", slug=f"c-{uuid4().hex[:10]}")
    db.add_all([co_a, co_b])
    db.flush()
    org_a = Organization(name="Org A", slug=f"org-a-{uuid4().hex[:6]}", company_id=co_a.id)
    org_b = Organization(name="Org B", slug=f"org-b-{uuid4().hex[:6]}", company_id=co_b.id)
    db.add_all([org_a, org_b])
    db.flush()
    user_a = User(org_id=org_a.id, company_id=co_a.id, email=f"a-{uuid4().hex[:6]}@a.com",
                  hashed_password="h" * 10, full_name="A")
    user_b = User(org_id=org_b.id, company_id=co_b.id, email=f"b-{uuid4().hex[:6]}@b.com",
                  hashed_password="h" * 10, full_name="B")
    db.add_all([user_a, user_b])
    db.flush()
    return org_a, org_b, user_a, user_b


def test_rls_isolates_behavior_evaluations_by_org(db: Session) -> None:
    org_a, org_b, user_a, user_b = _bootstrap_two_orgs_with_users(db)
    behavior = PillarBehavior(dimension_code="CP", pillar_code="ZZ", text="x")
    db.add(behavior)
    db.flush()
    db.add_all(
        [
            BehaviorEvaluation(org_id=org_a.id, user_id=user_a.id, behavior_id=behavior.id, rating=3),
            BehaviorEvaluation(org_id=org_b.id, user_id=user_b.id, behavior_id=behavior.id, rating=1),
        ]
    )
    db.flush()

    db.execute(text("SET LOCAL ROLE hg_app"))
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_a.id)})
    visible = db.execute(
        text("SELECT rating FROM behavior_evaluations WHERE user_id = :uid"), {"uid": str(user_a.id)}
    ).scalars().all()
    assert visible == [3]
    cross_org = db.execute(
        text("SELECT rating FROM behavior_evaluations WHERE user_id = :uid"), {"uid": str(user_b.id)}
    ).scalars().all()
    assert cross_org == []  # org B invisible desde el contexto de org A


def test_rls_blocks_cross_tenant_insert_on_behavior_evaluations(db: Session) -> None:
    org_a, org_b, _user_a, user_b = _bootstrap_two_orgs_with_users(db)
    behavior = PillarBehavior(dimension_code="CP", pillar_code="ZZ", text="x")
    db.add(behavior)
    db.flush()

    db.execute(text("SET LOCAL ROLE hg_app"))
    db.execute(text("SELECT set_config('app.current_org_id', :v, true)"), {"v": str(org_a.id)})
    with pytest.raises(DBAPIError):
        db.execute(
            text(
                "INSERT INTO behavior_evaluations (id, org_id, user_id, behavior_id, rating) "
                "VALUES (gen_random_uuid(), :oid, :uid, :bid, 3)"
            ),
            {"oid": str(org_b.id), "uid": str(user_b.id), "bid": str(behavior.id)},
        )
