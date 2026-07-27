"""Campos visuales opcionales de LU (Sprint UI Identidad · TASK 12).

Cubre roundtrip (create→read), backward-compat (sin el campo → NULL) y
validación fina, vía el admin router real (mismos endpoints que producción).
"""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.models import LearningUnit


def _superadmin_headers(factory, auth_headers):
    s = SessionLocal()
    try:
        if s.query(CareerPath).filter(CareerPath.code == "P1").first() is None:
            s.add(CareerPath(code="P1", name="Carrera e impacto", order_index=1))
            s.commit()
    finally:
        s.close()
    return auth_headers(factory.make_user(org=factory.make_org(), role=UserRole.superadmin))


def _cleanup(slug: str) -> None:
    s = SessionLocal()
    s.execute(delete(LearningUnit).where(LearningUnit.slug == slug))
    s.commit()
    s.close()


def _unit_payload(slug: str, **extra) -> dict:
    return {"slug": slug, "title": "t", "dimension_code": "CP", "level_code": "L2", **extra}


def _create_unit(client, headers, **extra) -> dict:
    slug = f"opt-{uuid.uuid4().hex[:10]}"
    r = client.post("/api/v1/admin/learning-units", headers=headers, json=_unit_payload(slug, **extra))
    return slug, r


def _add_block(client, headers, unit_id: str, payload: dict):
    return client.post(f"/api/v1/admin/learning-units/{unit_id}/blocks", headers=headers, json=payload)


# ─────────────────────────── narrative_tone + keywords (unit) ───────────────────────────


def test_unit_narrative_tone_and_keywords_roundtrip(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, r = _create_unit(client, headers, narrative_tone="contemplative", keywords=["foco", "calma"])
    try:
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["narrative_tone"] == "contemplative"
        assert body["keywords"] == ["foco", "calma"]
    finally:
        _cleanup(slug)


def test_unit_without_optional_fields_are_null(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, r = _create_unit(client, headers)
    try:
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["narrative_tone"] is None
        assert body["keywords"] is None
    finally:
        _cleanup(slug)


def test_invalid_narrative_tone_rejected(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, r = _create_unit(client, headers, narrative_tone="cinematic")
    _cleanup(slug)
    assert r.status_code == 422


# ─────────────────────────── chapters (video_blocks) ───────────────────────────


def test_video_chapters_roundtrip(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit = _create_unit(client, headers)
    try:
        chapters = [{"start_sec": 0, "label": "Intro"}, {"start_sec": 60, "label": "Parte 2"}]
        r = _add_block(client, headers, unit.json()["id"], {
            "block_type": "video_intro", "position": 1,
            "video_url": "https://cdn.example.com/x.mp4", "duration_seconds": 200, "chapters": chapters,
        })
        assert r.status_code == 201, r.text
        assert r.json()["chapters"] == chapters
    finally:
        _cleanup(slug)


def test_video_without_chapters_is_null(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit = _create_unit(client, headers)
    try:
        r = _add_block(client, headers, unit.json()["id"], {
            "block_type": "video_intro", "position": 1,
            "video_url": "https://cdn.example.com/x.mp4", "duration_seconds": 30,
        })
        assert r.status_code == 201, r.text
        assert r.json()["chapters"] is None
    finally:
        _cleanup(slug)


def test_more_than_5_chapters_rejected(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit = _create_unit(client, headers)
    try:
        r = _add_block(client, headers, unit.json()["id"], {
            "block_type": "video_intro", "position": 1,
            "video_url": "https://cdn.example.com/x.mp4", "duration_seconds": 200,
            "chapters": [{"start_sec": i * 10, "label": f"c{i}"} for i in range(6)],
        })
        assert r.status_code == 422
    finally:
        _cleanup(slug)


# ─────────────────────────── hero_stat + checklist_items (text_blocks) ───────────────────────────


def test_text_evidence_hero_stat_roundtrip(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit = _create_unit(client, headers)
    try:
        r = _add_block(client, headers, unit.json()["id"], {
            "block_type": "text_evidence", "position": 1, "variant": "evidence",
            "eyebrow": "EVIDENCIA", "body": "b",
            "citation": {"text": "a", "source": "s", "year": 2020, "doi_or_url": "https://x", "tier": "rct"},
            "hero_stat": {"value": "23%", "label": "mejora del desempeño", "source": "HBS"},
        })
        assert r.status_code == 201, r.text
        assert r.json()["hero_stat"] == {"value": "23%", "label": "mejora del desempeño", "source": "HBS"}
    finally:
        _cleanup(slug)


def test_text_solution_checklist_roundtrip(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit = _create_unit(client, headers)
    try:
        items = [{"title": "Paso 1", "detail": None}, {"title": "Paso 2", "detail": "expandible"}]
        r = _add_block(client, headers, unit.json()["id"], {
            "block_type": "text_solution", "position": 1, "variant": "solution",
            "eyebrow": "PROBÁ ESTO", "body": "b",
            "checklist_items": [{"title": "Paso 1"}, {"title": "Paso 2", "detail": "expandible"}],
        })
        assert r.status_code == 201, r.text
        assert r.json()["checklist_items"] == items
    finally:
        _cleanup(slug)


def test_text_without_optional_fields_are_null(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit = _create_unit(client, headers)
    try:
        r = _add_block(client, headers, unit.json()["id"], {
            "block_type": "text_context", "position": 1, "variant": "context",
            "eyebrow": "SITUACIÓN", "body": "b",
        })
        assert r.status_code == 201, r.text
        assert r.json()["hero_stat"] is None
        assert r.json()["checklist_items"] is None
    finally:
        _cleanup(slug)
