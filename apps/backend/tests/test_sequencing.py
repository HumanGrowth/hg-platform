"""Orden de módulos: convención del Drive + nivel según el score + orden estricto
con excepciones + inscripciones (sequencing.py, path_engine, /modulos/*)."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from hg.db import SessionLocal
from hg.modules.assessment.enums import DimensionCode
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath, Enrollment
from hg.modules.learning_units.models import LearningUnit, ModuleAssignment
from hg.modules.learning_units.sequencing import (
    content_level_from_assessment,
    pillar_sort_key,
    unit_sort_key,
)

from .test_path_engine import _assessment, _clear_all, _complete, _ensure_paths, _make_unit

# ─────────────────────────── piezas puras ───────────────────────────


def test_assessment_level_maps_to_content_level_in_pairs() -> None:
    got = [content_level_from_assessment(f"L{n}") for n in range(1, 7)]
    assert got == [1, 1, 2, 2, 3, 3]
    assert content_level_from_assessment(None) == 1
    assert content_level_from_assessment("solido") == 1  # estado de otra escala → default


def test_pillar_order_follows_convention() -> None:
    codes = ["AI", "P10", "P2", "P1", "V1", "V0", None]
    ordered = sorted(codes, key=pillar_sort_key)
    # sin pilar primero, luego numerados/estados por número, "AI" al final.
    assert ordered.index("AI") == len(codes) - 1
    assert ordered.index("P1") < ordered.index("P2") < ordered.index("P10")
    assert ordered.index("V0") < ordered.index("V1")


def test_unit_order_is_level_then_pillar_then_number() -> None:
    def mk(level: str, pillar: str, n: int) -> LearningUnit:
        return LearningUnit(slug=f"{level}{pillar}{n}", dimension_code="CP", level_code=level,
                            pillar_code=pillar, unit_number=n)

    units = [mk("L2", "P1", 1), mk("L1", "AI", 1), mk("L1", "P2", 2), mk("L1", "P2", 1), mk("L1", "P1", 5)]
    assert [u.slug for u in sorted(units, key=unit_sort_key)] == ["L1P15", "L1P21", "L1P22", "L1AI1", "L2P11"]


# ─────────────────────────── helpers de escenario ───────────────────────────


def _graduate(user) -> uuid.UUID:
    """Saca al colaborador de la restricción de onboarding (le asigna algo de OTRA
    dimensión, que no interfiere con la secuencia de CP)."""
    uid = _make_unit("SA", "L1", "V0", 1)
    s = SessionLocal()
    try:
        s.add(ModuleAssignment(org_id=user.org_id, user_id=user.id, learning_unit_id=uid))
        s.commit()
    finally:
        s.close()
    return uid


def _slug(unit_id: uuid.UUID) -> str:
    s = SessionLocal()
    try:
        return s.get(LearningUnit, unit_id).slug
    finally:
        s.close()


def _get(client, headers, unit_id):
    return client.get(f"/api/v1/modulos/{_slug(unit_id)}", headers=headers)


def _start(client, headers, unit_id):
    return client.post(f"/api/v1/modulos/{_slug(unit_id)}/attempts/start", headers=headers)


# ─────────────────────────── nivel según el score ───────────────────────────


def test_path_starts_at_the_level_of_the_users_score(client, factory, auth_headers) -> None:
    """CP L4 (assessment) → contenido L2: la ruta arranca en L2 y L1 es opcional."""
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    l1 = _make_unit("CP", "L1", "P1", 1)
    l2 = _make_unit("CP", "L2", "P1", 1)
    l3 = _make_unit("CP", "L3", "P1", 1)
    _assessment(user, DimensionCode.P1, "L4")
    _graduate(user)
    try:
        h = auth_headers(user)
        body = client.get("/api/v1/me/path", headers=h).json()
        assert body["current_level"] == "L2"
        assert body["next_step"]["unit_id"] == str(l2)
        assert body["next_step"]["locked"] is False
        assert str(l1) not in {s["unit_id"] for s in [body["next_step"], *body["upcoming"]]}
        # El nivel inferior sigue disponible (repaso / badges) aunque no sea obligatorio.
        assert _get(client, h, l1).status_code == 200
        assert _get(client, h, l3).status_code == 403  # y el superior sigue bloqueado
    finally:
        _clear_all()


def test_no_assessment_starts_at_level_one(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    l1 = _make_unit("CP", "L1", "P1", 1)
    _make_unit("CP", "L2", "P1", 1)
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["current_level"] == "L1"
        assert body["next_step"]["unit_id"] == str(l1)
    finally:
        _clear_all()


def test_score_above_available_content_clamps_to_highest_existing_level(client, factory, auth_headers) -> None:
    """CP L6 → contenido L3, pero solo hay L1: no queda una ruta vacía."""
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    l1 = _make_unit("CP", "L1", "P1", 1)
    _assessment(user, DimensionCode.P1, "L6")
    try:
        body = client.get("/api/v1/me/path", headers=auth_headers(user)).json()
        assert body["next_step"]["unit_id"] == str(l1)
    finally:
        _clear_all()


# ─────────────────────────── orden estricto ───────────────────────────


def test_only_the_next_unit_of_the_dimension_can_be_opened(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    u1 = _make_unit("CP", "L1", "P1", 1)
    u2 = _make_unit("CP", "L1", "P1", 2)
    _graduate(user)
    try:
        h = auth_headers(user)
        assert _get(client, h, u1).status_code == 200
        blocked = _get(client, h, u2)
        assert blocked.status_code == 403
        assert "anteriores" in blocked.json()["detail"]
        assert _start(client, h, u2).status_code == 403  # tampoco se puede iniciar por API

        # La ruta lo dice: u2 aparece pero bloqueada; el siguiente paso nunca.
        path = client.get("/api/v1/me/path", headers=h).json()
        assert path["next_step"]["unit_id"] == str(u1) and path["next_step"]["locked"] is False
        assert next(s for s in path["upcoming"] if s["unit_id"] == str(u2))["locked"] is True

        _complete(user, u1)
        assert _get(client, h, u2).status_code == 200  # se desbloquea al completar la anterior
    finally:
        _clear_all()


def test_levels_above_the_users_are_locked_until_the_score_rises(client, factory, auth_headers) -> None:
    """Tope: completar el nivel propio no abre el siguiente; lo abre subir el score."""
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    l1 = _make_unit("CP", "L1", "P1", 1)
    l2 = _make_unit("CP", "L2", "P1", 1)
    l3 = _make_unit("CP", "L3", "P1", 1)
    _graduate(user)
    try:
        h = auth_headers(user)
        blocked = _get(client, h, l2)
        assert blocked.status_code == 403
        assert "nivel" in blocked.json()["detail"]
        items = client.get("/api/v1/modulos/by-dimension", params={"dimension_code": "P1"}, headers=h).json()
        assert {i["id"]: i["lock_reason"] for i in items} == {str(l1): None, str(l2): "level", str(l3): "level"}

        _complete(user, l1)
        assert _get(client, h, l2).status_code == 403  # completar no alcanza

        _assessment(user, DimensionCode.P1, "L3")  # → contenido L2
        assert _get(client, h, l2).status_code == 200
        assert _get(client, h, l3).status_code == 403  # el tope sube de a un nivel de contenido
        assert _get(client, h, l1).status_code == 200  # nivel inferior: disponible (repaso)
    finally:
        _clear_all()


def test_completed_in_progress_and_assigned_units_are_exceptions(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    _make_unit("CP", "L1", "P1", 1)
    done = _make_unit("CP", "L1", "P1", 2)  # completada "fuera de orden" (dato previo) → repaso
    assigned = _make_unit("CP", "L1", "P1", 3)
    blocked = _make_unit("CP", "L1", "P1", 4)
    _graduate(user)
    _complete(user, done)
    s = SessionLocal()
    try:
        s.add(ModuleAssignment(org_id=user.org_id, user_id=user.id, learning_unit_id=assigned))
        s.commit()
    finally:
        s.close()
    try:
        h = auth_headers(user)
        assert _get(client, h, done).status_code == 200      # completada → repaso
        assert _get(client, h, assigned).status_code == 200  # asignada por un manager
        assert _get(client, h, blocked).status_code == 403   # el resto sigue el orden
    finally:
        _clear_all()


def test_non_learner_roles_are_not_restricted(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    admin = factory.make_user(org=factory.make_org(), role=UserRole.admin)
    _make_unit("CP", "L1", "P1", 1)
    later = _make_unit("CP", "L1", "P1", 2)
    try:
        assert _get(client, auth_headers(admin), later).status_code == 200
    finally:
        _clear_all()


def test_by_dimension_and_feed_flag_locked_units_and_feed_follows_the_path(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    u1 = _make_unit("CP", "L1", "P1", 1)
    u2 = _make_unit("CP", "L1", "P1", 2)
    ai = _make_unit("CP", "L1", "AI", 1)
    _graduate(user)
    try:
        h = auth_headers(user)
        items = client.get("/api/v1/modulos/by-dimension", params={"dimension_code": "P1"}, headers=h).json()
        assert [i["id"] for i in items] == [str(u1), str(u2), str(ai)]  # "AI" al final
        assert [i["locked"] for i in items] == [False, True, True]

        feed = client.get("/api/v1/modulos/feed", headers=h).json()
        assert feed["hero"]["id"] == str(u1)  # determinístico: el next_step de la ruta, no un azar
        assert feed["hero"]["locked"] is False
    finally:
        _clear_all()


# ─────────────────────────── inscripciones ───────────────────────────


def test_active_enrollments_define_the_dimensions_of_the_path(client, factory, auth_headers) -> None:
    _clear_all()
    _ensure_paths()  # P1 (Carrera) y P2 (Propósito)
    user = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    cp = _make_unit("CP", "L1", "P1", 1)
    pr = _make_unit("PR", "L1", "V0", 1)
    _graduate(user)
    s = SessionLocal()
    try:
        p2 = s.query(CareerPath).filter(CareerPath.code == "P2").one()
        s.add(Enrollment(org_id=user.org_id, user_id=user.id, career_path_id=p2.id, is_active=True,
                         enrolled_at=datetime.now(UTC)))
        s.commit()
    finally:
        s.close()
    try:
        h = auth_headers(user)
        body = client.get("/api/v1/me/path", headers=h).json()
        assert body["next_step"]["unit_id"] == str(pr)
        assert all(s["unit_id"] != str(cp) for s in [body["next_step"], *body["upcoming"]])
        assert _get(client, h, pr).status_code == 200
        assert _get(client, h, cp).status_code == 403  # fuera de las dimensiones inscriptas
    finally:
        _clear_all()
