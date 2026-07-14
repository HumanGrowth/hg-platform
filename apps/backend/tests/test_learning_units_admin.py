"""Admin CMS tests (TASK A-05): CRUD + publish validation (foco principal)."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.models import LearningUnit


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


def _superadmin_headers(factory, auth_headers):
    _p1_id()
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    return auth_headers(sa)


def _collaborator_headers(factory, auth_headers):
    collab = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    return auth_headers(collab)


def _cleanup(slug: str) -> None:
    s = SessionLocal()
    s.execute(delete(LearningUnit).where(LearningUnit.slug == slug))
    s.commit()
    s.close()


def _create_unit(client: TestClient, headers: dict, slug: str) -> dict:
    r = client.post(
        "/api/v1/admin/learning-units", headers=headers,
        json={"slug": slug, "title": "t", "pillar_code": "P1", "level_code": "L2"},
    )
    assert r.status_code == 201, r.text
    return r.json()


# ─────────────────────────── SuperadminGate ───────────────────────────


def test_non_superadmin_blocked(client: TestClient, factory, auth_headers) -> None:
    headers = _collaborator_headers(factory, auth_headers)
    r = client.post(
        "/api/v1/admin/learning-units", headers=headers,
        json={"slug": "x", "title": "t", "pillar_code": "P1", "level_code": "L2"},
    )
    assert r.status_code == 403


def test_anon_blocked(client: TestClient) -> None:
    r = client.post("/api/v1/admin/learning-units", json={})
    assert r.status_code in (401, 403)


# ─────────────────────────── Unit CRUD ───────────────────────────


def test_create_unit_then_duplicate_slug_conflicts(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        assert unit["blocks"] == []
        dup = client.post(
            "/api/v1/admin/learning-units", headers=headers,
            json={"slug": slug, "title": "other", "pillar_code": "P1", "level_code": "L2"},
        )
        assert dup.status_code == 409
    finally:
        _cleanup(slug)


def test_create_unit_rejects_bad_level_code(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    r = client.post(
        "/api/v1/admin/learning-units", headers=headers,
        json={"slug": f"admin-test-{uuid.uuid4().hex[:8]}", "title": "t", "pillar_code": "P1", "level_code": "L9"},
    )
    assert r.status_code == 422


def test_update_unit_partial(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        r = client.patch(
            f"/api/v1/admin/learning-units/{unit['id']}", headers=headers, json={"title": "Nuevo título"}
        )
        assert r.status_code == 200
        assert r.json()["title"] == "Nuevo título"
        assert r.json()["level_code"] == "L2"  # sin tocar
    finally:
        _cleanup(slug)


def test_delete_blocked_while_published_allowed_after_unpublish(
    client: TestClient, factory, auth_headers
) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _make_publishable_unit(client, headers, slug)
        publish = client.post(f"/api/v1/admin/learning-units/{unit['id']}/publish", headers=headers)
        assert publish.status_code == 200, publish.text

        blocked = client.delete(f"/api/v1/admin/learning-units/{unit['id']}", headers=headers)
        assert blocked.status_code == 409

        client.post(f"/api/v1/admin/learning-units/{unit['id']}/unpublish", headers=headers)
        ok = client.delete(f"/api/v1/admin/learning-units/{unit['id']}", headers=headers)
        assert ok.status_code == 204
    finally:
        _cleanup(slug)


# ─────────────────────────── Blocks CRUD ───────────────────────────


def test_create_each_block_type(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        uid = unit["id"]

        video = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={
                "block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ",
                "duration_seconds": 10,
            },
        )
        assert video.status_code == 201, video.text
        assert video.json()["youtube_video_id"] == "dQw4w9WgXcQ"

        text = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "text_context", "position": 2, "variant": "context", "eyebrow": "SITUACIÓN", "body": "b" * 40},
        )
        assert text.status_code == 201, text.text

        quiz = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={
                "block_type": "quiz_recall", "position": 3,
                "questions": [{
                    "question_type": "single_choice", "prompt": "p",
                    "options": [
                        {"text": "a", "is_correct": True, "explanation": "yes"},
                        {"text": "b", "is_correct": False, "explanation": "no"},
                    ],
                }],
            },
        )
        assert quiz.status_code == 201, quiz.text
        assert len(quiz.json()["questions"]) == 1

        reflection = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "reflection_write", "position": 4, "prompt": "p", "min_chars": 10, "max_chars": 100},
        )
        assert reflection.status_code == 201, reflection.text

        # unit no está publicada todavía -> consumer detail 404s, chequeamos vía admin.
        refreshed = client.patch(f"/api/v1/admin/learning-units/{uid}", headers=headers, json={"title": "t"})
        assert len(refreshed.json()["blocks"]) == 4
    finally:
        _cleanup(slug)


def _make_publishable_unit(client: TestClient, headers: dict, slug: str) -> dict:
    """Unit con exactamente lo mínimo para pasar publish: 1 video + evidence con
    DOI + solution referenciándola + quiz required con explanations completas."""
    unit = _create_unit(client, headers, slug)
    uid = unit["id"]

    client.post(
        f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
        json={"block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ", "duration_seconds": 10},
    )
    evidence = client.post(
        f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
        json={
            "block_type": "text_evidence", "position": 2, "variant": "evidence", "eyebrow": "EVIDENCIA",
            "body": "b" * 40,
            "citation": {
                "text": "Edmondson 1999", "source": "Edmondson", "year": 1999,
                "doi_or_url": "https://doi.org/10.2307/2666999", "tier": "observational",
            },
        },
    )
    evidence_block_id = evidence.json()["id"]
    client.post(
        f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
        json={
            "block_type": "text_solution", "position": 3, "variant": "solution", "eyebrow": "SOLUCIÓN",
            "body": "b" * 40, "requires_evidence_block_id": evidence_block_id,
        },
    )
    client.post(
        f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
        json={
            "block_type": "quiz_recall", "position": 4, "required": True,
            "questions": [{
                "question_type": "single_choice", "prompt": "p",
                "options": [
                    {"text": "a", "is_correct": True, "explanation": "yes"},
                    {"text": "b", "is_correct": False, "explanation": "no"},
                ],
            }],
        },
    )
    # No hay GET single-unit admin en el spec de A-05 — PATCH con body vacío
    # sirve como "refetch" (no-op sobre los campos, devuelve el detail actual).
    return client.patch(f"/api/v1/admin/learning-units/{uid}", headers=headers, json={}).json()


# ─────────────────────────── Publish validation ───────────────────────────


def test_publish_fails_without_video(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        r = client.post(f"/api/v1/admin/learning-units/{unit['id']}/publish", headers=headers)
        assert r.status_code == 422
        errors = r.json()["detail"]["errors"]
        assert any("video" in e for e in errors)
        assert any("text_evidence" in e for e in errors)
        assert any("text_solution" in e for e in errors)
        assert any("quiz_recall o reflection_write" in e for e in errors)
    finally:
        _cleanup(slug)


def test_publish_fails_without_evidence_doi(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        uid = unit["id"]
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ", "duration_seconds": 10},
        )
        # evidence SIN citation -> no cuenta
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "text_evidence", "position": 2, "variant": "evidence", "eyebrow": "E", "body": "b" * 40},
        )
        r = client.post(f"/api/v1/admin/learning-units/{uid}/publish", headers=headers)
        assert r.status_code == 422
        assert any("doi_or_url" in e for e in r.json()["detail"]["errors"])
    finally:
        _cleanup(slug)


def test_publish_fails_without_required_retrieval(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        uid = unit["id"]
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ", "duration_seconds": 10},
        )
        evidence = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={
                "block_type": "text_evidence", "position": 2, "variant": "evidence", "eyebrow": "E", "body": "b" * 40,
                "citation": {"text": "t", "source": "s", "year": 2020, "doi_or_url": "https://x", "tier": "rct"},
            },
        )
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={
                "block_type": "text_solution", "position": 3, "variant": "solution", "eyebrow": "S", "body": "b" * 40,
                "requires_evidence_block_id": evidence.json()["id"],
            },
        )
        # quiz existe pero required=False -> no cuenta
        client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={
                "block_type": "quiz_recall", "position": 4, "required": False,
                "questions": [{
                    "question_type": "true_false", "prompt": "p", "correct_answer": True,
                    "explanation_true": "y", "explanation_false": "n",
                }],
            },
        )
        r = client.post(f"/api/v1/admin/learning-units/{uid}/publish", headers=headers)
        assert r.status_code == 422
        assert any("required=true" in e for e in r.json()["detail"]["errors"])
    finally:
        _cleanup(slug)


def test_publish_succeeds_with_all_requirements_met(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _make_publishable_unit(client, headers, slug)
        r = client.post(f"/api/v1/admin/learning-units/{unit['id']}/publish", headers=headers)
        assert r.status_code == 200, r.text
        assert r.json()["published_at"] is not None

        # Ahora sí visible por el consumer.
        detail = client.get(f"/api/v1/modulos/{slug}", headers=headers)
        assert detail.status_code == 200
        assert len(detail.json()["blocks"]) == 4
    finally:
        _cleanup(slug)


# No hay test para la rama "slug duplicado" de _validate_for_publish: la
# tabla tiene UNIQUE(slug) a nivel DB (LU-01) y create_unit ya rechaza
# duplicados con 409 antes de que exista una segunda unit con el mismo slug
# — no hay manera legítima (sin escribir directo a la DB por fuera de la
# app) de dejar dos units persistidas con el mismo slug para ejercitar esa
# rama. El check en el validator queda como defensa redundante (lo pide el
# spec explícitamente) pero es información server-side, no lógica alcanzable
# por un test de integración honesto.


# ─────────────────────────── Block edit / delete / reorder ───────────────────────────


def test_patch_video_block_content(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        video = client.post(
            f"/api/v1/admin/learning-units/{unit['id']}/blocks", headers=headers,
            json={"block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ", "duration_seconds": 10},
        )
        template_id = video.json()["id"]
        # video.json()["id"] es el unit_block id (BlockRead.id); necesitamos el
        # template id real para el PATCH — lo recuperamos del detail admin.
        detail = client.patch(f"/api/v1/admin/learning-units/{unit['id']}", headers=headers, json={})
        unit_block = next(b for b in detail.json()["blocks"] if b["block_type"] == "video_intro")
        assert unit_block["id"] == template_id  # BlockRead.id == unit_blocks.id, consistente

        s = SessionLocal()
        from hg.modules.learning_units.models import UnitBlock
        real_template_id = s.scalar(
            select(UnitBlock.block_id).where(UnitBlock.id == uuid.UUID(unit_block["id"]))
        )
        s.close()

        r = client.patch(
            f"/api/v1/admin/blocks/video_intro/{real_template_id}", headers=headers,
            json={"duration_seconds": 15},
        )
        assert r.status_code == 200, r.text
    finally:
        _cleanup(slug)


def test_delete_block_removes_it_from_unit(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        video = client.post(
            f"/api/v1/admin/learning-units/{unit['id']}/blocks", headers=headers,
            json={"block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ", "duration_seconds": 10},
        )
        unit_block_id = video.json()["id"]
        r = client.delete(f"/api/v1/admin/blocks/{unit_block_id}", headers=headers)
        assert r.status_code == 204

        refreshed = client.patch(f"/api/v1/admin/learning-units/{unit['id']}", headers=headers, json={})
        assert refreshed.json()["blocks"] == []
    finally:
        _cleanup(slug)


def test_reorder_blocks(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        uid = unit["id"]
        b1 = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "video_intro", "position": 1, "youtube_video_id": "dQw4w9WgXcQ", "duration_seconds": 10},
        ).json()["id"]
        b2 = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks", headers=headers,
            json={"block_type": "text_context", "position": 2, "variant": "context", "eyebrow": "S", "body": "b" * 40},
        ).json()["id"]

        r = client.post(
            f"/api/v1/admin/learning-units/{uid}/blocks/reorder", headers=headers,
            json={"block_ids": [b2, b1]},
        )
        assert r.status_code == 200, r.text
        blocks = sorted(r.json()["blocks"], key=lambda b: b["position"])
        assert [b["id"] for b in blocks] == [b2, b1]
    finally:
        _cleanup(slug)


# ─────────────────────────── YouTube parsing (TASK A-06) ───────────────────────────


def test_create_video_block_accepts_full_url_and_autofills_poster(
    client: TestClient, factory, auth_headers
) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        r = client.post(
            f"/api/v1/admin/learning-units/{unit['id']}/blocks", headers=headers,
            json={
                "block_type": "video_intro", "position": 1, "duration_seconds": 10,
                "youtube_video_id": "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=5s",
            },
        )
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["youtube_video_id"] == "dQw4w9WgXcQ"
        assert body["poster_url"] == "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
    finally:
        _cleanup(slug)


def test_create_video_block_rejects_invalid_url(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        r = client.post(
            f"/api/v1/admin/learning-units/{unit['id']}/blocks", headers=headers,
            json={
                "block_type": "video_intro", "position": 1, "duration_seconds": 10,
                "youtube_video_id": "https://vimeo.com/12345",
            },
        )
        assert r.status_code == 422
    finally:
        _cleanup(slug)


def test_create_video_block_respects_explicit_poster_url(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug = f"admin-test-{uuid.uuid4().hex[:8]}"
    try:
        unit = _create_unit(client, headers, slug)
        r = client.post(
            f"/api/v1/admin/learning-units/{unit['id']}/blocks", headers=headers,
            json={
                "block_type": "video_intro", "position": 1, "duration_seconds": 10,
                "youtube_video_id": "dQw4w9WgXcQ", "poster_url": "https://example.com/custom.jpg",
            },
        )
        assert r.status_code == 201, r.text
        assert r.json()["poster_url"] == "https://example.com/custom.jpg"
    finally:
        _cleanup(slug)
