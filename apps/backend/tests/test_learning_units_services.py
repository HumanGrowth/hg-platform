"""Tests DB-backed de ``upsert_unit_from_dict`` + ``try_publish`` (TASK lu-refine-A-11).

Usan el fixture ``db`` (transaccional, rollback-per-test) — ``upsert_unit_from_dict``
sólo hace flush, así que todo se revierte al terminar el test.
"""
from __future__ import annotations

from typing import Any

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.learning_units.models import (
    LearningUnit,
    TextBlock,
    UnitBlock,
    UnitBlockType,
)
from hg.modules.learning_units.services import (
    UnitDictError,
    try_publish,
    upsert_unit_from_dict,
)
from hg.scripts.sync_units_from_drive import assemble_unit_dict

_CITATION = {
    "text": "Autor (2020)",
    "source": "Journal X",
    "year": 2020,
    "doi_or_url": "https://doi.org/10.1/x",
    "tier": "rct",
}


def _valid_unit_dict(slug: str = "hg-p2-l1-999-test") -> dict[str, Any]:
    """Unit publicable: video + context + evidence + solution + reflection required."""
    return {
        "slug": slug,
        "title": "Unit de prueba",
        "pillar_code": "P2",
        "competency_code": "C2",
        "level_code": "L1",
        "estimated_duration_seconds": 120,
        "blocks": [
            {"type": "video_intro", "video_url": "https://cdn/x/VID1.mp4",
             "duration_seconds": 60, "eyebrow_label": "VIDEO 1"},
            {"type": "text_context", "body": "Contexto."},
            {"type": "text_evidence", "body": "Evidencia.", "citation": _CITATION},
            {"type": "text_solution", "body": "Probá esto.", "requires_evidence_position": 3},
            {"type": "reflection_write", "prompt": "Reflexioná sobre esto.",
             "min_chars": 30, "max_chars": 500},
        ],
    }


def _blocks_ordered(db: Session, unit_id: Any) -> list[UnitBlock]:
    return list(
        db.scalars(
            select(UnitBlock).where(UnitBlock.unit_id == unit_id).order_by(UnitBlock.position)
        )
    )


def test_upsert_creates_unit_with_all_blocks(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _valid_unit_dict(), publish=False)
    blocks = _blocks_ordered(db, unit.id)
    assert [b.block_type for b in blocks] == [
        UnitBlockType.video_intro,
        UnitBlockType.text_context,
        UnitBlockType.text_evidence,
        UnitBlockType.text_solution,
        UnitBlockType.reflection_write,
    ]
    assert unit.published_at is None


def test_upsert_idempotent_by_slug(db: Session) -> None:
    slug = "hg-p2-l1-998-idem"
    upsert_unit_from_dict(db, _valid_unit_dict(slug), publish=False)
    first_count = db.scalar(select(func.count()).select_from(LearningUnit).where(LearningUnit.slug == slug))
    # Segundo upsert del mismo dict: no duplica.
    upsert_unit_from_dict(db, _valid_unit_dict(slug), publish=False)
    second_count = db.scalar(select(func.count()).select_from(LearningUnit).where(LearningUnit.slug == slug))
    assert first_count == 1
    assert second_count == 1


def test_upsert_resolves_requires_evidence_position(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _valid_unit_dict(), publish=False)
    blocks = _blocks_ordered(db, unit.id)
    evidence_ub = next(b for b in blocks if b.block_type == UnitBlockType.text_evidence)
    solution_ub = next(b for b in blocks if b.block_type == UnitBlockType.text_solution)

    evidence_tb = db.get(TextBlock, evidence_ub.block_id)
    solution_tb = db.get(TextBlock, solution_ub.block_id)
    assert solution_tb is not None and evidence_tb is not None
    # El solution apunta al text_block real de la evidence (no al unit_block).
    assert solution_tb.requires_evidence_block_id == evidence_tb.id


def test_upsert_publish_true_sets_published_at(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _valid_unit_dict(), publish=True)
    assert unit.published_at is not None


def _no_video_unit_dict(slug: str) -> dict[str, Any]:
    """Unit sin bloque de video → no pasa validación de publish. Las posiciones
    de evidence/solution son coherentes (evidence en pos 2)."""
    return {
        "slug": slug,
        "title": "Sin video",
        "pillar_code": "P2",
        "level_code": "L1",
        "blocks": [
            {"type": "text_context", "body": "Contexto."},
            {"type": "text_evidence", "body": "Evidencia.", "citation": _CITATION},
            {"type": "text_solution", "body": "Probá esto.", "requires_evidence_position": 2},
            {"type": "reflection_write", "prompt": "Reflexioná sobre esto.",
             "min_chars": 30, "max_chars": 500},
        ],
    }


def test_upsert_publish_true_raises_on_invalid(db: Session) -> None:
    with pytest.raises(HTTPException) as exc:
        upsert_unit_from_dict(db, _no_video_unit_dict("hg-p2-l1-997-novideo"), publish=True)
    assert exc.value.status_code == 422


def test_upsert_bad_evidence_position_raises(db: Session) -> None:
    spec = _valid_unit_dict("hg-p2-l1-996-badref")
    # apunta a una posición que no es text_evidence
    spec["blocks"][3]["requires_evidence_position"] = 1
    with pytest.raises(UnitDictError):
        upsert_unit_from_dict(db, spec, publish=False)


def test_upsert_unknown_block_type_raises(db: Session) -> None:
    spec = _valid_unit_dict("hg-p2-l1-995-badblock")
    spec["blocks"].append({"type": "totally_made_up", "body": "x"})
    with pytest.raises(UnitDictError):
        upsert_unit_from_dict(db, spec, publish=False)


def test_try_publish_returns_errors_for_invalid(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _no_video_unit_dict("hg-p2-l1-994-draft"), publish=False)
    errors = try_publish(db, unit)
    assert errors  # no vacío
    assert any("video" in e for e in errors)
    assert unit.published_at is None  # sigue borrador


def test_try_publish_ok_for_valid(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _valid_unit_dict("hg-p2-l1-993-ok"), publish=False)
    assert try_publish(db, unit) == []
    assert unit.published_at is not None


def test_assemble_then_upsert_keeps_evidence_link(db: Session) -> None:
    """Integración con el flujo del sync: prepend de video corre las posiciones,
    pero el link solution→evidence sigue resuelto correctamente."""
    unit_json = {
        "slug": "hg-p2-l1-992-assemble",
        "title": "Assemble",
        "pillar_code": "P2",
        "level_code": "L1",
        "blocks": [
            {"type": "text_context", "body": "c"},
            {"type": "text_evidence", "body": "e", "citation": _CITATION},
            {"type": "text_solution", "body": "s", "requires_evidence_position": 2},
            {"type": "reflection_write", "prompt": "Reflexioná sobre esto.",
             "min_chars": 30, "max_chars": 500},
        ],
    }
    unit_dict = assemble_unit_dict(unit_json, ["https://cdn/x/VID1.mp4", "https://cdn/x/VID2.mp4"])
    unit = upsert_unit_from_dict(db, unit_dict, publish=True)  # publicable

    blocks = _blocks_ordered(db, unit.id)
    assert [b.block_type for b in blocks[:2]] == [
        UnitBlockType.video_intro, UnitBlockType.video_teaching,
    ]
    evidence_ub = next(b for b in blocks if b.block_type == UnitBlockType.text_evidence)
    solution_ub = next(b for b in blocks if b.block_type == UnitBlockType.text_solution)
    solution_tb = db.get(TextBlock, solution_ub.block_id)
    assert solution_tb is not None
    assert solution_tb.requires_evidence_block_id == evidence_ub.block_id
    assert unit.published_at is not None
