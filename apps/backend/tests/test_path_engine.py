"""Mi Ruta · motor de recomendación GET /me/path (cierre-beta TASK 1)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.assessment.enums import DimensionCode, ResultSource
from hg.modules.assessment.models import DimensionResult
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt


def _ensure_paths() -> None:
    s = SessionLocal()
    try:
        for code, name, order in [("P1", "Carrera", 1), ("P2", "Propósito", 2)]:
            if s.scalar(select(CareerPath).where(CareerPath.code == code)) is None:
                s.add(CareerPath(code=code, name=name, order_index=order))
        s.commit()
    finally:
        s.close()


def _make_unit(dimension_code: str, level_code: str, pillar_number: int, unit_number: int) -> uuid.UUID:
    s = SessionLocal()
    try:
        u = LearningUnit(
            slug=f"pe-{uuid.uuid4().hex[:8]}", title=f"{dimension_code}-{level_code}-{unit_number}",
            dimension_code=dimension_code, level_code=level_code, pillar_number=pillar_number,
            unit_number=unit_number, published_at=datetime.now(UTC),
        )
        s.add(u)
        s.commit()
        return u.id
    finally:
        s.close()


def _complete(user, unit_id: uuid.UUID) -> None:
    s = SessionLocal()
    try:
        s.add(LearningUnitAttempt(
            user_id=user.id, unit_id=unit_id, org_id=user.org_id,
            started_at=datetime.now(UTC), completed_at=datetime.now(UTC),
        ))
        s.commit()
    finally:
        s.close()


def _assessment(user, dimension: DimensionCode, state_code: str) -> None:
    s = SessionLocal()
    try:
        s.add(DimensionResult(
            org_id=user.org_id, user_id=user.id, dimension_code=dimension, source=ResultSource.preliminary,
            state_code=state_code, state_label=state_code, sub_scores={}, derived_at=datetime.now(UTC),
            next_retake_eligible_at=datetime.now(UTC),
        ))
        s.commit()
    finally:
        s.close()


def _clear_all() -> None:
    """El path engine consulta TODAS las units publicadas (catálogo global sin
    org). Para aislar cada test, limpiamos el catálogo antes de crear el propio."""
    s = SessionLocal()
    s.execute(delete(LearningUnit))  # CASCADE borra attempts
    s.commit()
    s.close()


def test_no_assessment_default_drive_order(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    u1 = _make_unit("CP", "L1", 1, 1)
    _make_unit("CP", "L1", 1, 2)
    try:
        res = client.get("/api/v1/me/path", headers=auth_headers(user))
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["current_level"] == "L1"
        assert body["next_step"]["unit_id"] == str(u1)  # menor unit_number primero
        assert body["total_this_level"] == 2
        assert body["completed_this_level"] == 0
        p1 = next(d for d in body["dimensions_progress"] if d["career_path_code"] == "P1")
        assert p1["total"] == 2 and p1["completed"] == 0
    finally:
        _clear_all()


def test_prioritizes_lowest_scoring_dimension(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    _make_unit("CP", "L1", 1, 1)  # Carrera (P1)
    pr = _make_unit("PR", "L1", 1, 1)  # Propósito (P2)
    # P1 alto (L5), P2 bajo (L1) → next_step debe ser el de P2 (más bajo).
    _assessment(user, DimensionCode.P1, "L5")
    _assessment(user, DimensionCode.P2, "L1")
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["next_step"]["unit_id"] == str(pr)
        assert body["next_step"]["career_path_code"] == "P2"
    finally:
        _clear_all()


def test_advances_to_next_level_when_current_complete(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    l1 = _make_unit("CP", "L1", 1, 1)
    l2 = _make_unit("CP", "L2", 1, 1)
    _complete(user, l1)
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["current_level"] == "L2"
        assert body["next_step"]["unit_id"] == str(l2)
    finally:
        _clear_all()


def test_all_completed_no_next_step(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    u1 = _make_unit("CP", "L1", 1, 1)
    _complete(user, u1)
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["current_level"] is None
        assert body["next_step"] is None
    finally:
        _clear_all()
