"""GET /assessment/me/radar — actual + evaluación anterior (Sprint Tarde · TASK 6.3)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.assessment.enums import DimensionCode, ResultSource
from hg.modules.assessment.models import DimensionResult


def _add_result(org_id, user_id, dimension: DimensionCode, state_code: str, derived_at: datetime) -> None:
    s = SessionLocal()
    try:
        s.add(
            DimensionResult(
                org_id=org_id,
                user_id=user_id,
                dimension_code=dimension,
                source=ResultSource.confirmed,
                state_code=state_code,
                state_label=state_code,
                next_retake_eligible_at=derived_at + timedelta(days=30),
                derived_at=derived_at,
            )
        )
        s.commit()
    finally:
        s.close()


def _cleanup(user_id) -> None:
    s = SessionLocal()
    s.execute(delete(DimensionResult).where(DimensionResult.user_id == user_id))
    s.commit()
    s.close()


def test_radar_returns_current_and_previous_per_dimension(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    now = datetime.now(UTC)
    _add_result(org.id, user.id, DimensionCode.P1, "L2", now - timedelta(days=40))  # previo
    _add_result(org.id, user.id, DimensionCode.P1, "L4", now - timedelta(days=1))  # actual
    _add_result(org.id, user.id, DimensionCode.P2, "N1", now - timedelta(days=5))  # sólo actual
    try:
        res = client.get("/api/v1/assessment/me/radar", headers=auth_headers(user))
        assert res.status_code == 200
        body = res.json()

        current = {c["dimension_code"]: c["state_code"] for c in body["current"]}
        assert current["P1"] == "L4"
        assert current["P2"] == "N1"

        previous = {p["dimension_code"]: p["state_code"] for p in body["previous"]}
        assert previous == {"P1": "L2"}  # sólo P1 tiene 2 evaluaciones
        assert body["previous_date"] is not None
    finally:
        _cleanup(user.id)


def test_radar_no_previous_with_single_evaluation(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    _add_result(org.id, user.id, DimensionCode.P3, "N2", datetime.now(UTC))
    try:
        res = client.get("/api/v1/assessment/me/radar", headers=auth_headers(user))
        body = res.json()
        assert body["previous"] is None
        assert body["previous_date"] is None
        assert {c["dimension_code"] for c in body["current"]} == {"P3"}
    finally:
        _cleanup(user.id)
