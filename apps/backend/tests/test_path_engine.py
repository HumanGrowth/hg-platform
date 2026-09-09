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


def _make_unit(dimension_code: str, level_code: str, pillar_code: str, unit_number: int) -> uuid.UUID:
    s = SessionLocal()
    try:
        u = LearningUnit(
            slug=f"pe-{uuid.uuid4().hex[:8]}", title=f"{dimension_code}-{level_code}-{unit_number}",
            dimension_code=dimension_code, level_code=level_code, pillar_code=pillar_code,
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
    u1 = _make_unit("CP", "L1", "P1", 1)
    _make_unit("CP", "L1", "P1", 2)
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


def test_prioritizes_cp_then_lowest_scoring(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    cp = _make_unit("CP", "L1", "P1", 1)  # Carrera (P1)
    pr = _make_unit("PR", "L1", "P1", 1)  # Propósito (P2)
    # CP alto (L5), PR bajo (L1). Aun así CP es prioridad → next_step = CP; el
    # resto se alterna tomando la de menor score (PR) primero.
    _assessment(user, DimensionCode.P1, "L5")
    _assessment(user, DimensionCode.P2, "L1")
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["next_step"]["unit_id"] == str(cp)  # CP prioritario
        assert body["next_step"]["career_path_code"] == "P1"
        # El siguiente alterna al resto (la dimensión de menor score = PR/P2).
        assert body["upcoming"][0]["unit_id"] == str(pr)
        assert body["upcoming"][0]["career_path_code"] == "P2"
    finally:
        _clear_all()


def test_advances_to_next_level_when_current_complete(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    l1 = _make_unit("CP", "L1", "P1", 1)
    l2 = _make_unit("CP", "L2", "P1", 1)
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
    u1 = _make_unit("CP", "L1", "P1", 1)
    _complete(user, u1)
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["current_level"] is None
        assert body["next_step"] is None
    finally:
        _clear_all()


def test_milestones_surface_for_every_pillar_not_just_the_closest(client, factory, auth_headers) -> None:
    """Antes, `_build_milestones` recortaba a una ventana de ~9 pasos: con dos
    pilares en curso en el mismo nivel, el segundo (o ambos, si el primero es
    grande) quedaba afuera. Ahora el hito se ubica por `sequence_position`
    sobre la secuencia COMPLETA del nivel, sin ventana."""
    from hg.modules.badges.models import Badge

    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)

    # P1: 10 units pendientes (su hito cae en sequence_position=9, fuera de la
    # ventana vieja de 9). P2: 2 units, más lejos todavía (position=11).
    for i in range(1, 11):
        _make_unit("CP", "L1", "P1", i)
    for i in range(1, 3):
        _make_unit("CP", "L1", "P2", i)

    s = SessionLocal()
    b1 = Badge(code="pillar-cp-p1", name="Área P1", icon_url="")
    b2 = Badge(code="pillar-cp-p2", name="Área P2", icon_url="")
    s.add_all([b1, b2])
    s.commit()
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        area_codes = {m["badge_code"] for m in body["milestones"] if m["kind"] == "area"}
        assert area_codes == {"pillar-cp-p1", "pillar-cp-p2"}
        p1 = next(m for m in body["milestones"] if m["badge_code"] == "pillar-cp-p1")
        p2 = next(m for m in body["milestones"] if m["badge_code"] == "pillar-cp-p2")
        assert p1["sequence_position"] == 9
        assert p2["sequence_position"] == 11
    finally:
        s.execute(delete(Badge).where(Badge.code.in_(["pillar-cp-p1", "pillar-cp-p2"])))
        s.commit()
        s.close()
        _clear_all()


def test_next_step_prioritizes_in_progress_unit_over_recommendation(
    client, factory, auth_headers
) -> None:
    """Si hay una unit YA EMPEZADA (sin completar), next_step debe ser ESA —
    no la que la ronda-robin recomendaría — para que coincida con lo que
    Módulos abre (retomar antes que recomendar algo nuevo)."""
    from datetime import UTC, datetime

    from sqlalchemy import select as sa_select

    from hg.db import SessionLocal
    from hg.modules.learning_units.models import LearningUnitAttempt

    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)

    # P1 tiene prioridad de ronda-robin sobre P2 → sin nada en curso, next_step
    # sería la primera unit de P1.
    p1_u1 = _make_unit("CP", "L1", "P1", 1)
    _make_unit("CP", "L1", "P1", 2)
    p2_u1 = _make_unit("CP", "L1", "P2", 1)

    s = SessionLocal()
    s.add(LearningUnitAttempt(
        user_id=user.id, unit_id=p2_u1, org_id=user.org_id,
        started_at=datetime.now(UTC), completed_at=None,
    ))
    s.commit()
    s.close()

    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["next_step"]["unit_id"] == str(p2_u1)
        # La que hubiera sido recomendada (P1#1) sigue en upcoming, no se pierde.
        upcoming_ids = {s["unit_id"] for s in body["upcoming"]}
        assert str(p1_u1) in upcoming_ids
    finally:
        _clear_all()


def test_ai_pillar_always_ranks_last_within_dimension(client, factory, auth_headers) -> None:
    """"AI" (Foundation) ordena alfabéticamente ANTES que "P1" — sin
    `pillar_rank`, el motor terminaba recomendando módulos de IA antes que el
    resto de los pilares de Carrera. AI debe ir siempre al final."""
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)

    ai_unit = _make_unit("CP", "L1", "AI", 1)
    p5_unit = _make_unit("CP", "L1", "P5", 1)

    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        # P5 (numerado) va antes que AI, aunque "AI" < "P5" alfabéticamente.
        assert body["next_step"]["unit_id"] == str(p5_unit)
        upcoming_ids = [s["unit_id"] for s in body["upcoming"]]
        assert str(ai_unit) in upcoming_ids
        assert upcoming_ids[-1] == str(ai_unit)
    finally:
        _clear_all()
