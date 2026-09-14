"""FASE 1.4: pesos configurables del score + recompute masivo (superadmin)."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import select

from hg.db import SessionLocal
from hg.modules.badges import progression
from hg.modules.badges.models import DimensionLevelProgress, DimensionScoringConfig
from hg.modules.identity.models import UserRole

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


def _reset_cp_weights() -> None:
    s = SessionLocal()
    cfg = s.get(DimensionScoringConfig, "CP")
    cfg.learning_weight, cfg.assessment_weight, cfg.manager_weight = 0.7, 0.3, 0.0
    s.commit()
    s.close()


def test_superadmin_lists_scoring_config(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.superadmin)
    res = client.get("/api/v1/admin/scoring-config", headers=auth_headers(admin))
    assert res.status_code == 200, res.text
    codes = {row["dimension_code"] for row in res.json()}
    assert codes == {"CP", "PR", "RE", "SA", "PI", "ES"}


def test_non_superadmin_cannot_list_scoring_config(client, factory, auth_headers) -> None:
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    res = client.get("/api/v1/admin/scoring-config", headers=auth_headers(admin))
    assert res.status_code == 403


def test_update_weights_rejects_zero_sum(client, factory, auth_headers) -> None:
    org = factory.make_org()
    superadmin = factory.make_user(org=org, role=UserRole.superadmin)
    res = client.put(
        "/api/v1/admin/scoring-config/CP",
        headers=auth_headers(superadmin),
        json={"learning_weight": 0, "assessment_weight": 0, "manager_weight": 0},
    )
    assert res.status_code == 422


def test_update_weights_rejects_unknown_dimension(client, factory, auth_headers) -> None:
    org = factory.make_org()
    superadmin = factory.make_user(org=org, role=UserRole.superadmin)
    res = client.put(
        "/api/v1/admin/scoring-config/ZZ",
        headers=auth_headers(superadmin),
        json={"learning_weight": 0.5, "assessment_weight": 0.5, "manager_weight": 0},
    )
    assert res.status_code == 404


def test_update_weights_and_recompute_moves_completion(client, factory, auth_headers) -> None:
    """El recompute masivo toca `dimension_level_progress` de TODOS los
    usuarios activos (no solo el de este test) — por eso, tras verificar el
    efecto, se restauran los pesos default y se vuelve a recomputar en el
    `finally`, dejando al resto de la DB (incluido contenido real sincronizado
    localmente) tal como estaba antes del test."""
    org = factory.make_org()
    superadmin = factory.make_user(org=org, role=UserRole.superadmin)
    user = factory.make_user(org=org)
    s = SessionLocal()
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    try:
        updated = client.put(
            "/api/v1/admin/scoring-config/CP",
            headers=auth_headers(superadmin),
            json={"learning_weight": 1.0, "assessment_weight": 0.0, "manager_weight": 0.0},
        )
        assert updated.status_code == 200, updated.text
        assert updated.json()["learning_weight"] == 1.0

        recomputed = client.post(
            "/api/v1/admin/scoring-config/recompute?dimension_code=CP",
            headers=auth_headers(superadmin),
        )
        assert recomputed.status_code == 200, recomputed.text
        assert recomputed.json()["dimension_codes"] == ["CP"]
        assert recomputed.json()["users_recomputed"] >= 1

        row = s.scalar(
            select(DimensionLevelProgress).where(
                DimensionLevelProgress.user_id == user.id,
                DimensionLevelProgress.dimension_code == "CP",
                DimensionLevelProgress.level_code == "L1",
            )
        )
        assert row is not None
        assert row.completion_pct == 100.0  # learning_weight=1.0, unit completada
    finally:
        _reset_cp_weights()
        client.post(
            "/api/v1/admin/scoring-config/recompute?dimension_code=CP",
            headers=auth_headers(superadmin),
        )
        cleanup_units(s, [unit.id])
        s.close()


def test_recompute_with_default_weights_is_a_regression(factory) -> None:
    """Recomputar sin tocar pesos (defaults) no debería mover el completion —
    ejercita `progression.recompute_dimension` directamente, más rápido que
    ida y vuelta HTTP para una simple regresión."""
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=unit, when=datetime.now(UTC), completed=True)
    try:
        progression.recompute_dimension(s, user, "CP")
        s.commit()
        row = s.scalar(
            select(DimensionLevelProgress).where(
                DimensionLevelProgress.user_id == user.id,
                DimensionLevelProgress.dimension_code == "CP",
                DimensionLevelProgress.level_code == "L1",
            )
        )
        before = row.completion_pct

        progression.recompute_dimension(s, user, "CP")
        s.commit()
        s.refresh(row)
        assert row.completion_pct == before
    finally:
        cleanup_units(s, [unit.id])
