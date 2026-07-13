"""HTTP integration tests for the consumer router (TASK A-04): completion
logic end-to-end + replay reset. Unidad de grading por tipo ya cubierta en
test_quiz_grading.py — acá se prueba el flujo completo vía API."""
from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.models import (
    LearningUnit,
    QuizBlock,
    QuizOption,
    QuizQuestion,
    ReflectionBlock,
    TextBlock,
    UnitBlock,
)


def _p1_id() -> uuid.UUID:
    s = SessionLocal()
    try:
        p = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))
        if p is None:
            p = CareerPath(code="P1", name="Carrera e impacto", order_index=1)
            s.add(p)
            s.commit()
        return p.id
    finally:
        s.close()


def _make_unit(slug: str) -> tuple[uuid.UUID, uuid.UUID, uuid.UUID, uuid.UUID]:
    """Unit publicada: 1 text_context (required) + 1 quiz_recall de 1 pregunta
    single_choice (required) + 1 reflection_write (required). Devuelve
    (unit_id, text_unit_block_id, quiz_unit_block_id, reflection_unit_block_id)."""
    s = SessionLocal()
    try:
        text = TextBlock(variant="context", eyebrow="SITUACIÓN", body="b" * 40)
        s.add(text)
        s.flush()

        quiz = QuizBlock(eyebrow="e")
        s.add(quiz)
        s.flush()
        question = QuizQuestion(quiz_block_id=quiz.id, position=1, question_type="single_choice", prompt="p")
        s.add(question)
        s.flush()
        s.add(QuizOption(question_id=question.id, position=1, text="right", is_correct=True, explanation="y"))
        s.add(QuizOption(question_id=question.id, position=2, text="wrong", is_correct=False, explanation="n"))
        s.flush()

        reflection = ReflectionBlock(prompt="p", min_chars=10, max_chars=200)
        s.add(reflection)
        s.flush()

        unit = LearningUnit(
            slug=slug, title="t", pillar_code="P1", level_code="L2",
            published_at=datetime.now(UTC),
        )
        s.add(unit)
        s.flush()

        ub_text = UnitBlock(unit_id=unit.id, position=1, block_type="text_context", block_id=text.id, required=True)
        ub_quiz = UnitBlock(unit_id=unit.id, position=2, block_type="quiz_recall", block_id=quiz.id, required=True)
        ub_refl = UnitBlock(
            unit_id=unit.id, position=3, block_type="reflection_write", block_id=reflection.id, required=True
        )
        s.add_all([ub_text, ub_quiz, ub_refl])
        s.commit()
        return unit.id, ub_text.id, ub_quiz.id, ub_refl.id
    finally:
        s.close()


def _cleanup(unit_id: uuid.UUID) -> None:
    s = SessionLocal()
    s.execute(delete(LearningUnit).where(LearningUnit.id == unit_id))  # CASCADE
    s.commit()
    s.close()


def _auth(factory, auth_headers):
    _p1_id()
    u = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    return u, auth_headers(u)


def test_full_completion_flow(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, text_block_id, quiz_block_id, refl_block_id = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        detail = client.get(f"/api/v1/modulos/{slug}", headers=headers)
        assert detail.status_code == 200
        assert len(detail.json()["blocks"]) == 3

        start = client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        assert start.status_code == 200
        assert start.json()["completed_at"] is None

        r1 = client.post(f"/api/v1/modulos/{slug}/blocks/{text_block_id}/complete", headers=headers)
        assert r1.status_code == 200

        # correct option is whichever has is_correct=True — fetch it from detail.
        quiz_block = next(b for b in detail.json()["blocks"] if b["block_type"] == "quiz_recall")
        question = quiz_block["questions"][0]
        options = question["options"]
        # We don't know which option id is correct from the read schema (hidden) —
        # submit the first, check server-computed correctness via response instead.
        submit = client.post(
            f"/api/v1/modulos/{slug}/blocks/{quiz_block_id}/quiz/submit",
            headers=headers,
            json={"responses": [{
                "question_id": question["id"], "question_type": "single_choice",
                "selected_option_ids": [options[0]["id"]],
            }]},
        )
        assert submit.status_code == 200
        assert submit.json()["block_completed"] is True

        attempt_mid = client.get(f"/api/v1/modulos/{slug}/attempt", headers=headers).json()
        assert attempt_mid["completed_at"] is None  # falta reflection

        refl = client.post(
            f"/api/v1/modulos/{slug}/blocks/{refl_block_id}/reflection/submit",
            headers=headers, json={"text": "Esta semana voy a probar esto en mi equipo, a ver qué pasa."},
        )
        assert refl.status_code == 200

        attempt_final = client.get(f"/api/v1/modulos/{slug}/attempt", headers=headers).json()
        assert attempt_final["completed_at"] is not None
        statuses = {bp["unit_block_id"]: bp["status"] for bp in attempt_final["block_progress"]}
        assert all(s == "completed" for s in statuses.values())
    finally:
        _cleanup(unit_id)


def test_quiz_endpoint_rejects_non_quiz_block(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, text_block_id, _, _ = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        r = client.post(
            f"/api/v1/modulos/{slug}/blocks/{text_block_id}/quiz/submit",
            headers=headers, json={"responses": []},
        )
        assert r.status_code == 400
    finally:
        _cleanup(unit_id)


def test_complete_endpoint_rejects_quiz_block(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, _, quiz_block_id, _ = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        r = client.post(f"/api/v1/modulos/{slug}/blocks/{quiz_block_id}/complete", headers=headers)
        assert r.status_code == 400
    finally:
        _cleanup(unit_id)


def test_reflection_rejects_too_short_text(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, _, _, refl_block_id = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        r = client.post(
            f"/api/v1/modulos/{slug}/blocks/{refl_block_id}/reflection/submit",
            headers=headers, json={"text": "short"},
        )
        assert r.status_code == 422
    finally:
        _cleanup(unit_id)


def test_replay_resets_completed_attempt(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, text_block_id, quiz_block_id, refl_block_id = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        client.post(f"/api/v1/modulos/{slug}/blocks/{text_block_id}/complete", headers=headers)
        detail = client.get(f"/api/v1/modulos/{slug}", headers=headers).json()
        quiz_block = next(b for b in detail["blocks"] if b["block_type"] == "quiz_recall")
        question = quiz_block["questions"][0]
        client.post(
            f"/api/v1/modulos/{slug}/blocks/{quiz_block_id}/quiz/submit", headers=headers,
            json={"responses": [{
                "question_id": question["id"], "question_type": "single_choice",
                "selected_option_ids": [question["options"][0]["id"]],
            }]},
        )
        client.post(
            f"/api/v1/modulos/{slug}/blocks/{refl_block_id}/reflection/submit",
            headers=headers, json={"text": "Primera reflexión completa de esta unit de prueba."},
        )
        first_attempt = client.get(f"/api/v1/modulos/{slug}/attempt", headers=headers).json()
        assert first_attempt["completed_at"] is not None
        first_attempt_id = first_attempt["id"]

        # Replay: llamar /attempts/start de nuevo debe resetear (misma row).
        replay = client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        assert replay.status_code == 200
        assert replay.json()["id"] == first_attempt_id  # mismo attempt, no uno nuevo
        assert replay.json()["completed_at"] is None
        assert replay.json()["block_progress"] == []
    finally:
        _cleanup(unit_id)


def test_double_completion_of_same_unit_does_not_move_completed_at(
    client: TestClient, factory, auth_headers
) -> None:
    """Completar el último bloque requerido dos veces no debería re-settear
    completed_at a un timestamp más nuevo (idempotencia de _maybe_complete_unit)."""
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, text_block_id, quiz_block_id, refl_block_id = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        client.post(f"/api/v1/modulos/{slug}/blocks/{text_block_id}/complete", headers=headers)
        detail = client.get(f"/api/v1/modulos/{slug}", headers=headers).json()
        quiz_block = next(b for b in detail["blocks"] if b["block_type"] == "quiz_recall")
        question = quiz_block["questions"][0]
        client.post(
            f"/api/v1/modulos/{slug}/blocks/{quiz_block_id}/quiz/submit", headers=headers,
            json={"responses": [{
                "question_id": question["id"], "question_type": "single_choice",
                "selected_option_ids": [question["options"][0]["id"]],
            }]},
        )
        client.post(
            f"/api/v1/modulos/{slug}/blocks/{refl_block_id}/reflection/submit",
            headers=headers, json={"text": "Primera vez completando esta reflexión de prueba."},
        )
        first = client.get(f"/api/v1/modulos/{slug}/attempt", headers=headers).json()
        completed_at_1 = first["completed_at"]

        # Re-enviar la misma reflection (permitido, upsert) no debería tocar completed_at.
        client.post(
            f"/api/v1/modulos/{slug}/blocks/{refl_block_id}/reflection/submit",
            headers=headers, json={"text": "Segunda vez, edito mi reflexión de prueba."},
        )
        second = client.get(f"/api/v1/modulos/{slug}/attempt", headers=headers).json()
        assert second["completed_at"] == completed_at_1
    finally:
        _cleanup(unit_id)


def test_feed_shows_unit_as_hero_when_in_progress(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, text_block_id, _, _ = _make_unit(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)
        client.post(f"/api/v1/modulos/{slug}/blocks/{text_block_id}/complete", headers=headers)

        feed = client.get("/api/v1/modulos/feed", headers=headers)
        assert feed.status_code == 200
        body = feed.json()
        assert body["hero"] is not None
        assert body["hero"]["slug"] == slug
        assert body["hero"]["attempt_status"] == "in_progress"
        assert body["hero"]["blocks_count"] == 3
    finally:
        _cleanup(unit_id)


def test_feed_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/modulos/feed").status_code in (401, 403)
