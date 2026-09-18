"""Tags de presentación por bloque (plantillas sociales) — aditivo/opt-in.

Cubre: (1) ``presentation`` es opcional (sin él → NULL y la API devuelve null),
(2) roundtrip por el admin router, (3) ingesta: valida/ignora tags inválidos sin
romper y es idempotente por slug, (4) hero_stat/checklist_items del JSON se
persisten.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

from fastapi.testclient import TestClient
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.models import LearningUnit, TextBlock, UnitBlock
from hg.modules.learning_units.services import sanitize_presentation, upsert_unit_from_dict
from hg.scripts.sync_units_from_drive import sanitize_unit_json

_CITATION = {"text": "a", "source": "s", "year": 2020, "doi_or_url": "https://x", "tier": "rct"}


# ─────────────────────────── helpers (API) ───────────────────────────


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


def _new_unit(client, headers) -> tuple[str, str]:
    slug = f"pres-{uuid.uuid4().hex[:10]}"
    r = client.post(
        "/api/v1/admin/learning-units",
        headers=headers,
        json={"slug": slug, "title": "t", "dimension_code": "CP", "level_code": "L2"},
    )
    assert r.status_code == 201, r.text
    return slug, r.json()["id"]


def _text_payload(**extra) -> dict:
    return {
        "block_type": "text_context", "position": 1, "variant": "context",
        "eyebrow": "SITUACIÓN", "body": "b", **extra,
    }


def _add_block(client, headers, unit_id: str, payload: dict):
    return client.post(f"/api/v1/admin/learning-units/{unit_id}/blocks", headers=headers, json=payload)


# ─────────────────────────── API: opcional + roundtrip ───────────────────────────


def test_presentation_is_optional_and_null_by_default(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit_id = _new_unit(client, headers)
    try:
        r = _add_block(client, headers, unit_id, _text_payload())
        assert r.status_code == 201, r.text
        assert r.json()["presentation"] is None
        # Y en la DB queda NULL (no `{}`): "sin tags" = columna vacía.
        s = SessionLocal()
        try:
            assert s.scalars(select(TextBlock.presentation)).all().count(None) >= 1
        finally:
            s.close()
    finally:
        _cleanup(slug)


def test_presentation_roundtrip(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit_id = _new_unit(client, headers)
    try:
        r = _add_block(client, headers, unit_id, _text_payload(presentation={
            "template": "quote", "tone": "green", "format": "feed",
            "pull_quote": {"text": "Lo que se mide, se mejora.", "attribution": "Drucker"},
        }))
        assert r.status_code == 201, r.text
        # exclude_none: sólo se guardan los tags realmente presentes.
        assert r.json()["presentation"] == {
            "template": "quote", "tone": "green", "format": "feed",
            "pull_quote": {"text": "Lo que se mide, se mejora.", "attribution": "Drucker"},
        }
    finally:
        _cleanup(slug)


def test_presentation_rejects_invalid_value_via_api(client: TestClient, factory, auth_headers) -> None:
    headers = _superadmin_headers(factory, auth_headers)
    slug, unit_id = _new_unit(client, headers)
    try:
        r = _add_block(client, headers, unit_id, _text_payload(presentation={"template": "fancy"}))
        assert r.status_code == 422
    finally:
        _cleanup(slug)


# ─────────────────────────── sanitize_presentation (puro) ───────────────────────────


def test_sanitize_presentation_none_when_no_tags() -> None:
    assert sanitize_presentation({"type": "text_context", "body": "x", "eyebrow": "E"}) is None


def test_sanitize_presentation_reads_flat_tags_from_spec_example() -> None:
    block = {
        "type": "text_evidence", "template": "stat", "tone": "green",
        "eyebrow": "El dato", "hero_stat": {"value": "79%", "label": "x"}, "body": "b",
    }
    # eyebrow / hero_stat NO se mueven a presentation (tienen columna propia).
    assert sanitize_presentation(block) == {"template": "stat", "tone": "green"}


def test_sanitize_presentation_ignores_invalid_with_warning(caplog) -> None:
    block = {"template": "stat", "tone": "neon", "format": "story", "accent": 3, "motif": "none"}
    with caplog.at_level(logging.WARNING, logger="hg.learning_units.services"):
        out = sanitize_presentation(block, "slug-x")
    assert out == {"template": "stat", "format": "story", "motif": "none"}
    warned = " ".join(r.getMessage() for r in caplog.records)
    assert "tone" in warned and "accent" in warned and "slug-x" in warned


def test_sanitize_presentation_drops_malformed_structured_tags() -> None:
    out = sanitize_presentation({"template": "quote", "pull_quote": "no soy un objeto", "cta": {"href": "/x"}})
    assert out == {"template": "quote"}


def test_sanitize_presentation_accepts_nested_dict_and_flat_wins() -> None:
    out = sanitize_presentation({"presentation": {"tone": "cream", "template": "tip"}, "template": "steps"})
    assert out == {"tone": "cream", "template": "steps"}


# ─────────────────────────── ingesta end-to-end ───────────────────────────


def _unit_dict(slug: str, **text_extra: Any) -> dict[str, Any]:
    return {
        "slug": slug, "title": "Unit", "dimension_code": "CP", "level_code": "L1",
        "blocks": [
            {"type": "video_intro", "video_url": "https://cdn/x.mp4", "duration_seconds": 60},
            {"type": "text_context", "body": "Sin tags."},
            {"type": "text_evidence", "body": ">> Titular ==clave==", "citation": _CITATION, **text_extra},
            {"type": "reflection_write", "prompt": "Reflexioná sobre esto.", "min_chars": 30},
        ],
    }


def _text_blocks(db: Session, unit_id: Any) -> list[TextBlock]:
    rows = db.scalars(
        select(UnitBlock).where(UnitBlock.unit_id == unit_id).order_by(UnitBlock.position)
    ).all()
    return [db.get(TextBlock, b.block_id) for b in rows if b.block_type.value.startswith("text_")]


def test_ingest_persists_presentation_hero_stat_and_checklist(db: Session) -> None:
    ud = sanitize_unit_json(_unit_dict(
        "pres-ingest-ok", template="stat", tone="green",
        hero_stat={"value": "79%", "label": "de las renuncias evitables", "source": "WEF"},
        checklist_items=[{"n": 1, "title": "Uno"}, {"n": 2, "title": "Dos", "detail": "d"}],
    ))
    unit = upsert_unit_from_dict(db, ud)
    context, evidence = _text_blocks(db, unit.id)
    assert context.presentation is None and context.hero_stat is None  # sin tags → NULL
    assert evidence.presentation == {"template": "stat", "tone": "green"}
    assert evidence.hero_stat == {"value": "79%", "label": "de las renuncias evitables", "source": "WEF"}
    assert [i["title"] for i in evidence.checklist_items] == ["Uno", "Dos"]


def test_ingest_invalid_tags_do_not_break_and_are_ignored(db: Session, caplog) -> None:
    with caplog.at_level(logging.WARNING, logger="hg.learning_units.services"):
        ud = sanitize_unit_json(_unit_dict(
            "pres-ingest-bad", template="hologram", tone="charcoal",
            hero_stat={"value": "x" * 99, "label": "demasiado largo"},  # value > 20 chars
        ))
    unit = upsert_unit_from_dict(db, ud)  # no levanta
    evidence = _text_blocks(db, unit.id)[1]
    assert evidence.presentation == {"tone": "charcoal"}  # el válido sobrevive
    assert evidence.hero_stat is None                     # el inválido se descartó
    assert any("template" in r.getMessage() for r in caplog.records)


def test_ingest_is_idempotent_by_slug(db: Session) -> None:
    slug = "pres-ingest-idem"
    upsert_unit_from_dict(db, sanitize_unit_json(_unit_dict(slug, template="quote")))
    unit = upsert_unit_from_dict(db, sanitize_unit_json(_unit_dict(slug, template="steps")))
    assert db.scalars(select(LearningUnit).where(LearningUnit.slug == slug)).all() == [unit]
    assert _text_blocks(db, unit.id)[1].presentation == {"template": "steps"}
