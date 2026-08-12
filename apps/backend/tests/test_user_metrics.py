"""Métricas por usuario · fuente única + consistencia cross-role (Release TASK 2)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.assessment.enums import PillarCode, ResultSource
from hg.modules.assessment.models import PillarResult
from hg.modules.identity.models import UserRole


def _add_result(org_id, user_id, pillar: PillarCode, state: str, when: datetime) -> None:
    s = SessionLocal()
    try:
        s.add(
            PillarResult(
                org_id=org_id, user_id=user_id, pillar_code=pillar, source=ResultSource.confirmed,
                state_code=state, state_label=f"Nivel {state}",
                next_retake_eligible_at=when + timedelta(days=30), derived_at=when,
            )
        )
        s.commit()
    finally:
        s.close()


def _cleanup(user_id) -> None:
    s = SessionLocal()
    s.execute(delete(PillarResult).where(PillarResult.user_id == user_id))
    s.commit()
    s.close()


def test_me_metrics_returns_canonical_states(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    now = datetime.now(UTC)
    _add_result(org.id, user.id, PillarCode.P1, "L2", now - timedelta(days=30))
    _add_result(org.id, user.id, PillarCode.P1, "L4", now - timedelta(days=1))  # más nuevo → gana
    try:
        res = client.get("/api/v1/me/metrics", headers=auth_headers(user))
        assert res.status_code == 200
        body = res.json()
        assert body["assessment_states"]["P1"]["state"] == "L4"
        assert body["last_assessment_date"] is not None
        assert "badges_unlocked_count" in body and "pillar_completion_rate" in body
    finally:
        _cleanup(user.id)


def test_manager_sees_same_states_as_collaborator(client: TestClient, factory, auth_headers) -> None:
    """El manager (/team/[id]) y el colaborador (/me/results) ven los MISMOS
    estados del assessment para el mismo user (consistencia cross-role)."""
    org = factory.make_org()
    manager = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=manager.id)
    now = datetime.now(UTC)
    _add_result(org.id, report.id, PillarCode.P1, "L3", now - timedelta(days=2))
    _add_result(org.id, report.id, PillarCode.P3, "N2", now - timedelta(days=1))
    try:
        # Colaborador (el propio report) vía /me/results.
        me = client.get("/api/v1/assessment/me/results", headers=auth_headers(report))
        assert me.status_code == 200
        me_states = {r["pillar_code"]: r["state_code"] for r in me.json()["results"]}
        # Manager vía /team/[id] detail.
        mgr = client.get(f"/api/v1/manager/users/{report.id}/detail", headers=auth_headers(manager))
        assert mgr.status_code == 200
        mgr_states = {code: st["state"] for code, st in mgr.json()["assessment_states"].items()}

        assert me_states == mgr_states == {"P1": "L3", "P3": "N2"}
    finally:
        _cleanup(report.id)
