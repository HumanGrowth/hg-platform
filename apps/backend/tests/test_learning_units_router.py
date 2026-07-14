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


# ─────────── Integración completa: admin crea/publica → consumer completa (A-10) ───────────


def _superadmin_headers(factory, auth_headers):
    _p1_id()
    from hg.modules.identity.models import UserRole as _UserRole
    sa = factory.make_user(org=factory.make_org(), role=_UserRole.superadmin)
    return auth_headers(sa)


def test_full_admin_create_to_consumer_complete_flow(client: TestClient, factory, auth_headers) -> None:
    """create unit → add blocks → publish → user starts attempt → completes
    blocks → completes unit, todo vía HTTP real (admin + consumer), sin tocar
    la DB directamente — el flujo end-to-end que pide el criterio de A-10."""
    admin_headers = _superadmin_headers(factory, auth_headers)
    slug = f"e2e-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = client.post(
            "/api/v1/admin/learning-units", headers=admin_headers,
            json={"slug": slug, "title": "t", "pillar_code": "P1", "level_code": "L2"},
        ).json()
        uid = unit["id"]

        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=admin_headers,
            json={"block_type": "video_intro", "position": 1, "video_url": "https://cdn.example.com/v.mp4", "duration_seconds": 10},
        )
        evidence = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=admin_headers,
            json={
                "block_type": "text_evidence", "position": 2, "variant": "evidence", "eyebrow": "E", "body": "b" * 40,
                "citation": {
                    "text": "t", "source": "s", "year": 2020,
                    "doi_or_url": "https://doi.org/10.2307/2666999", "tier": "observational",
                },
            },
        )
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=admin_headers,
            json={
                "block_type": "text_solution", "position": 3, "variant": "solution", "eyebrow": "S", "body": "b" * 40,
                "requires_evidence_block_id": evidence.json()["id"],
            },
        )
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=admin_headers,
            json={
                "block_type": "quiz_recall", "position": 4, "required": True,
                "questions": [{
                    "question_type": "single_choice", "prompt": "p",
                    "options": [
                        {"text": "right", "is_correct": True, "explanation": "yes"},
                        {"text": "wrong", "is_correct": False, "explanation": "no"},
                    ],
                }],
            },
        )

        publish = client.post(f"/api/v1/admin/learning-units/{uid}/publish", headers=admin_headers)
        assert publish.status_code == 200, publish.text

        _, user_headers = _auth(factory, auth_headers)

        detail = client.get(f"/api/v1/modulos/{slug}", headers=user_headers)
        assert detail.status_code == 200
        blocks = detail.json()["blocks"]
        assert len(blocks) == 4

        start = client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=user_headers)
        assert start.status_code == 200

        video_block = next(b for b in blocks if b["block_type"] == "video_intro")
        r1 = client.post(f"/api/v1/modulos/{slug}/blocks/{video_block['id']}/complete", headers=user_headers)
        assert r1.status_code == 200

        solution_block = next(b for b in blocks if b["block_type"] == "text_solution")
        r2 = client.post(f"/api/v1/modulos/{slug}/blocks/{solution_block['id']}/complete", headers=user_headers)
        assert r2.status_code == 200

        evidence_block = next(b for b in blocks if b["block_type"] == "text_evidence")
        r3 = client.post(f"/api/v1/modulos/{slug}/blocks/{evidence_block['id']}/complete", headers=user_headers)
        assert r3.status_code == 200

        quiz_block = next(b for b in blocks if b["block_type"] == "quiz_recall")
        question = quiz_block["questions"][0]
        submit = client.post(
            f"/api/v1/modulos/{slug}/blocks/{quiz_block['id']}/quiz/submit", headers=user_headers,
            json={"responses": [{
                "question_id": question["id"], "question_type": "single_choice",
                "selected_option_ids": [question["options"][0]["id"]],
            }]},
        )
        assert submit.status_code == 200
        assert submit.json()["block_completed"] is True

        final_attempt = client.get(f"/api/v1/modulos/{slug}/attempt", headers=user_headers).json()
        assert final_attempt["completed_at"] is not None
    finally:
        s = SessionLocal()
        s.execute(delete(LearningUnit).where(LearningUnit.slug == slug))
        s.commit()
        s.close()


# ─────────── Serialización + submit vía API para los 5 tipos de pregunta restantes ───────────


def _make_unit_with_all_question_types(slug: str) -> tuple[uuid.UUID, uuid.UUID]:
    """Unit publicada con 1 quiz_recall que tiene 1 pregunta de cada uno de
    los 5 tipos restantes (single_choice ya cubierto en otros tests).
    Devuelve (unit_id, quiz_unit_block_id)."""
    from hg.modules.learning_units.models import (
        QuizFillBlankAnswer,
        QuizMatchingPair,
        QuizMultipleChoiceConfig,
        QuizOrderingItem,
        QuizTrueFalse,
    )

    s = SessionLocal()
    try:
        quiz = QuizBlock(eyebrow="e")
        s.add(quiz)
        s.flush()

        mc = QuizQuestion(quiz_block_id=quiz.id, position=1, question_type="multiple_choice", prompt="mc")
        s.add(mc)
        s.flush()
        s.add(QuizOption(question_id=mc.id, position=1, text="a", is_correct=True, explanation="ya"))
        s.add(QuizOption(question_id=mc.id, position=2, text="b", is_correct=True, explanation="yb"))
        s.add(QuizOption(question_id=mc.id, position=3, text="c", is_correct=False, explanation="nc"))
        s.add(QuizMultipleChoiceConfig(question_id=mc.id, scoring="all_or_nothing"))

        tf = QuizQuestion(quiz_block_id=quiz.id, position=2, question_type="true_false", prompt="tf")
        s.add(tf)
        s.flush()
        s.add(QuizTrueFalse(question_id=tf.id, correct_answer=True, explanation_true="y", explanation_false="n"))

        ordering = QuizQuestion(quiz_block_id=quiz.id, position=3, question_type="ordering", prompt="ord")
        s.add(ordering)
        s.flush()
        s.add(QuizOrderingItem(question_id=ordering.id, text="first", correct_position=1, explanation="s1"))
        s.add(QuizOrderingItem(question_id=ordering.id, text="second", correct_position=2, explanation="s2"))

        matching = QuizQuestion(quiz_block_id=quiz.id, position=4, question_type="matching", prompt="match")
        s.add(matching)
        s.flush()
        s.add(QuizMatchingPair(question_id=matching.id, left_text="l1", right_text="r1", is_distractor=False))
        s.add(QuizMatchingPair(question_id=matching.id, left_text="l2", right_text="r2", is_distractor=False))

        fb = QuizQuestion(quiz_block_id=quiz.id, position=5, question_type="fill_blank", prompt="fb {{blank}}")
        s.add(fb)
        s.flush()
        s.add(QuizFillBlankAnswer(question_id=fb.id, position=1, correct_text="Edmondson", accept_variants=[]))
        s.flush()

        unit = LearningUnit(
            slug=slug, title="t", pillar_code="P1", level_code="L2", published_at=datetime.now(UTC),
        )
        s.add(unit)
        s.flush()
        ub_quiz = UnitBlock(
            unit_id=unit.id, position=1, block_type="quiz_recall", block_id=quiz.id, required=True
        )
        s.add(ub_quiz)
        s.commit()
        return unit.id, ub_quiz.id
    finally:
        s.close()


def test_quiz_submit_all_five_remaining_question_types(client: TestClient, factory, auth_headers) -> None:
    slug = f"test-unit-{uuid.uuid4().hex[:8]}"
    unit_id, quiz_block_id = _make_unit_with_all_question_types(slug)
    _, headers = _auth(factory, auth_headers)
    try:
        client.post(f"/api/v1/modulos/{slug}/attempts/start", headers=headers)

        detail = client.get(f"/api/v1/modulos/{slug}", headers=headers).json()
        questions = {q["question_type"]: q for q in detail["blocks"][0]["questions"]}
        assert set(questions) == {"multiple_choice", "true_false", "ordering", "matching", "fill_blank"}

        mc = questions["multiple_choice"]
        assert mc["scoring"] == "all_or_nothing"
        correct_mc_ids = [o["id"] for o in mc["options"] if o["text"] in ("a", "b")]

        ordering = questions["ordering"]
        by_text = {i["text"]: i["id"] for i in ordering["items"]}
        correct_order = [by_text["first"], by_text["second"]]

        matching = questions["matching"]
        left_by_id = {i["id"] for i in matching["left_items"]}
        right_by_id = {i["id"] for i in matching["right_items"]}
        assert left_by_id == right_by_id  # non-distractor pairs comparten id entre lados
        correct_pairs = [[i, i] for i in left_by_id]

        submit = client.post(
            f"/api/v1/modulos/{slug}/blocks/{quiz_block_id}/quiz/submit", headers=headers,
            json={"responses": [
                {"question_id": mc["id"], "question_type": "multiple_choice", "selected_option_ids": correct_mc_ids},
                {"question_id": questions["true_false"]["id"], "question_type": "true_false", "boolean_answer": True},
                {"question_id": ordering["id"], "question_type": "ordering", "ordering": correct_order},
                {"question_id": matching["id"], "question_type": "matching", "matching": correct_pairs},
                {
                    "question_id": questions["fill_blank"]["id"], "question_type": "fill_blank",
                    "fill_blank_answers": ["edmondson"],
                },
            ]},
        )
        assert submit.status_code == 200, submit.text
        results = {r["question_id"]: r for r in submit.json()["results"]}
        assert all(r["is_correct"] for r in results.values()), submit.json()
        assert submit.json()["block_completed"] is True
    finally:
        _cleanup(unit_id)


# ─────────────────────── /modulos/by-pillar (TASK lu-refine-A-03) ───────────────────────


def _make_minimal_unit(
    slug: str, *, pillar_code: str, level_code: str, superseded_by: uuid.UUID | None = None
) -> uuid.UUID:
    """Unit publicada sin bloques — alcanza para probar filtro/orden/attempt_status
    de /modulos/by-pillar, que no toca el contenido de los bloques."""
    s = SessionLocal()
    try:
        unit = LearningUnit(
            slug=slug, title=slug, pillar_code=pillar_code, level_code=level_code,
            published_at=datetime.now(UTC), superseded_by_unit_id=superseded_by,
        )
        s.add(unit)
        s.commit()
        return unit.id
    finally:
        s.close()


def test_by_pillar_filters_and_orders_by_level_then_created_at(
    client: TestClient, factory, auth_headers
) -> None:
    _, headers = _auth(factory, auth_headers)
    slugs = [f"bp-test-{uuid.uuid4().hex[:8]}" for _ in range(4)]
    ids = []
    try:
        # L2 creado primero, L1 después, otro L1 después de ese (más nuevo),
        # y uno de otro pilar que no debe aparecer.
        ids.append(_make_minimal_unit(slugs[0], pillar_code="P2", level_code="L2"))
        ids.append(_make_minimal_unit(slugs[1], pillar_code="P2", level_code="L1"))
        ids.append(_make_minimal_unit(slugs[2], pillar_code="P2", level_code="L1"))
        ids.append(_make_minimal_unit(slugs[3], pillar_code="P3", level_code="L1"))

        res = client.get("/api/v1/modulos/by-pillar", headers=headers, params={"pillar_code": "P2"})
        assert res.status_code == 200, res.text
        body = res.json()
        returned_slugs = [u["slug"] for u in body]
        assert slugs[3] not in returned_slugs  # otro pilar, excluido
        # L1s primero (orden ASC por level_code), y entre los dos L1 el más
        # nuevo (slugs[2]) antes que el más viejo (slugs[1]) — tie-break DESC.
        assert returned_slugs.index(slugs[2]) < returned_slugs.index(slugs[1])
        assert returned_slugs.index(slugs[1]) < returned_slugs.index(slugs[0])
        assert all(u["attempt_status"] == "not_started" for u in body)
    finally:
        for uid in ids:
            s = SessionLocal()
            s.execute(delete(LearningUnit).where(LearningUnit.id == uid))
            s.commit()
            s.close()


def test_by_pillar_level_filter_and_excludes_superseded(
    client: TestClient, factory, auth_headers
) -> None:
    _, headers = _auth(factory, auth_headers)
    slug_old = f"bp-test-{uuid.uuid4().hex[:8]}"
    slug_new = f"bp-test-{uuid.uuid4().hex[:8]}"
    slug_other_level = f"bp-test-{uuid.uuid4().hex[:8]}"
    ids = []
    try:
        new_id = _make_minimal_unit(slug_new, pillar_code="P4", level_code="L1")
        old_id = _make_minimal_unit(slug_old, pillar_code="P4", level_code="L1", superseded_by=new_id)
        other_level_id = _make_minimal_unit(slug_other_level, pillar_code="P4", level_code="L3")
        ids = [new_id, old_id, other_level_id]

        res = client.get(
            "/api/v1/modulos/by-pillar", headers=headers,
            params={"pillar_code": "P4", "level_code": "L1"},
        )
        assert res.status_code == 200, res.text
        returned_slugs = {u["slug"] for u in res.json()}
        assert slug_new in returned_slugs
        assert slug_old not in returned_slugs  # superseded, excluida
        assert slug_other_level not in returned_slugs  # level_code no matchea
    finally:
        for uid in ids:
            s = SessionLocal()
            s.execute(delete(LearningUnit).where(LearningUnit.id == uid))
            s.commit()
            s.close()


def test_by_pillar_requires_valid_pillar_code(client: TestClient, factory, auth_headers) -> None:
    _, headers = _auth(factory, auth_headers)
    res = client.get("/api/v1/modulos/by-pillar", headers=headers, params={"pillar_code": "P9"})
    assert res.status_code == 422
