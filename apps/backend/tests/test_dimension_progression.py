"""Capa Empresa · TASK 6: completion 0-100 por dimensión/nivel + unlock de badges.

Se ejercita ``badges.progression`` directamente contra la sesión de fixtures
(rol ``hg`` = superuser, BYPASSRLS) — no vía HTTP.
"""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import func, select

from hg.modules.assessment.enums import DimensionCode, ResultSource
from hg.modules.assessment.models import DimensionResult
from hg.modules.assessment.scoring import dimension_value_from_states, state_to_value
from hg.modules.badges import progression
from hg.modules.badges.models import Badge, DimensionLevelProgress, UserBadge

from ._lu_helpers import cleanup_units, make_unit, seed_attempt

# ─────────────────────────── scoring puro ───────────────────────────


def test_state_to_value_and_es_average() -> None:
    assert state_to_value("L6") == 100.0
    assert state_to_value("L3") == 50.0
    assert state_to_value(None) == 0.0
    assert state_to_value("desconocido") == 0.0
    # ES = promedio de P6A (Alta=100) + P6B (Vulnerable=66)
    assert dimension_value_from_states(["Alta", "Vulnerable"]) == 83.0


def _seed_dim_result(factory, user, code: DimensionCode, state: str) -> None:
    now = datetime.now(UTC)
    factory.session.add(
        DimensionResult(
            org_id=user.org_id, user_id=user.id, dimension_code=code,
            source=ResultSource.preliminary, state_code=state, state_label=state,
            sub_scores={}, derived_at=now, next_retake_eligible_at=now,
        )
    )
    factory.session.commit()


# ─────────────────────────── blend + persistencia ───────────────────────────


def test_completion_blends_learning_and_assessment(factory) -> None:
    """CP: 1 unit L1 completada (learning=100) + assessment P1 L3 (=50) →
    completion L1 = 0.7*100 + 0.3*50 = 85. Niveles sin units (L2/L3) = 15."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    _seed_dim_result(factory, user, DimensionCode.P1, "L3")
    try:
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        rows = {
            r.level_code: r
            for r in s.scalars(
                select(DimensionLevelProgress).where(
                    DimensionLevelProgress.user_id == user.id,
                    DimensionLevelProgress.dimension_code == "CP",
                )
            ).all()
        }
        assert rows["L1"].learning_pct == 100.0
        assert rows["L1"].assessment_pct == 50.0
        assert rows["L1"].completion_pct == 85.0
        assert rows["L2"].completion_pct == 15.0  # sin units → solo assessment
    finally:
        cleanup_units(s, [unit.id])


def test_level_badge_unlocks_at_threshold_and_conserves_max(factory) -> None:
    """Learning 100 + assessment 100 → completion 100 → badge level-cp-l1. Al
    bajar el assessment, el badge se conserva (no se revoca)."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    _seed_dim_result(factory, user, DimensionCode.P1, "L6")  # value 100
    badge = s.scalar(select(Badge).where(Badge.code == "level-cp-l1"))
    assert badge is not None
    try:
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        assert s.scalar(
            select(func.count()).select_from(UserBadge).where(
                UserBadge.user_id == user.id, UserBadge.badge_id == badge.id
            )
        ) == 1

        # Idempotente: recompute otra vez → sigue habiendo 1.
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        assert s.scalar(
            select(func.count()).select_from(UserBadge).where(UserBadge.badge_id == badge.id)
        ) == 1

        # Baja el assessment (state peor) → completion baja, pero el badge queda.
        s.query(DimensionResult).filter(DimensionResult.user_id == user.id).delete()
        _seed_dim_result(factory, user, DimensionCode.P1, "L1")  # value 17
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        row = s.scalar(
            select(DimensionLevelProgress).where(
                DimensionLevelProgress.user_id == user.id,
                DimensionLevelProgress.dimension_code == "CP",
                DimensionLevelProgress.level_code == "L1",
            )
        )
        assert row.completion_pct < 100  # bajó
        assert s.scalar(
            select(func.count()).select_from(UserBadge).where(
                UserBadge.user_id == user.id, UserBadge.badge_id == badge.id
            )
        ) == 1  # el badge se conserva
    finally:
        s.query(UserBadge).filter(UserBadge.user_id == user.id).delete()
        cleanup_units(s, [unit.id])


def test_progression_summary_current_level(factory) -> None:
    """El summary devuelve el nivel actual = primero sin llegar al umbral."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    _seed_dim_result(factory, user, DimensionCode.P1, "L3")  # 50 → completion L1 = 85
    try:
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        summary = {d["dimension_code"]: d for d in progression.progression_summary(s, user.id)}
        cp = summary["CP"]
        assert cp["current_level_code"] == "L1"  # 85 < 100, sigue en L1
        assert cp["current_completion_pct"] == 85.0
        assert len(cp["levels"]) == 3
        assert cp["levels"][0]["earned"] is False
    finally:
        cleanup_units(s, [unit.id])


def test_pillar_subbadge_awarded_when_pillar_completed(factory) -> None:
    """Completar todas las units de un (dimensión, pilar) otorga el sub-badge —
    pre-seedeado por ensure_pillar_badge (como haría el sync)."""
    from hg.modules.badges.progression import ensure_pillar_badge, pillar_badge_code

    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    u1 = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    u2 = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    for u in (u1, u2):
        u.pillar_code = "P1"
    s.commit()
    ensure_pillar_badge(s, "CP", "P1")  # el sync pre-seedea el Badge de catálogo
    code = pillar_badge_code("CP", "P1")
    try:
        # Solo 1 de 2 completa → todavía no.
        seed_attempt(s, org_id=org.id, user_id=user.id, unit=u1, when=datetime.now(UTC), completed=True)
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        badge = s.scalar(select(Badge).where(Badge.code == code))
        assert badge is not None
        assert s.scalar(
            select(func.count()).select_from(UserBadge).where(
                UserBadge.user_id == user.id, UserBadge.badge_id == badge.id
            )
        ) == 0

        # Completa la 2da → pilar completo → sub-badge.
        seed_attempt(s, org_id=org.id, user_id=user.id, unit=u2, when=datetime.now(UTC), completed=True)
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        assert s.scalar(
            select(func.count()).select_from(UserBadge).where(
                UserBadge.user_id == user.id, UserBadge.badge_id == badge.id
            )
        ) == 1
    finally:
        s.query(UserBadge).filter(UserBadge.user_id == user.id).delete()
        s.query(Badge).filter(Badge.code == code).delete()
        cleanup_units(s, [u1.id, u2.id])
