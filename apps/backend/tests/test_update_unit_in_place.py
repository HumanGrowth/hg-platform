"""Tests DB-backed de ``update_unit_in_place``: actualizar una unit existente
conservando su id, los ids de bloque emparejados y el progreso de usuarios
(intentos, ``block_progress``, textos de reflexión), a diferencia de
``upsert_unit_from_dict`` (delete + recreate con CASCADE).

Usan ``db`` (rollback-per-test) + ``factory`` (users/orgs commiteados). ``factory``
va ANTES que ``db`` en la firma: los fixtures se destruyen en orden inverso, y el
cleanup de ``factory`` (DELETE de la empresa) se bloquearía contra la transacción
abierta de ``db`` si ésta siguiera viva.
"""
from __future__ import annotations

import copy
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.learning_units.models import (
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
    QuizQuestion,
    ReflectionBlock,
    ReflectionText,
    TextBlock,
    UnitBlock,
)
from hg.modules.learning_units.services import (
    update_unit_in_place,
    upsert_unit_from_dict,
)

_CITATION = {
    "text": "Autor (2020)", "source": "Journal X", "year": 2020,
    "doi_or_url": "https://doi.org/10.1/x", "tier": "rct",
}

_QUIZ = {
    "type": "quiz_recall",
    "questions": [{
        "type": "true_false", "prompt": "¿Verdadero?", "correct_answer": True,
        "explanation_true": "Sí.", "explanation_false": "No.",
    }],
}


def _unit(slug: str = "hg-p2-l1-998-inplace") -> dict[str, Any]:
    return {
        "slug": slug, "title": "Original", "dimension_code": "CP", "competency_code": "C2",
        "level_code": "L1", "pillar_code": "P2", "unit_number": 998,
        "estimated_duration_seconds": 120,
        "blocks": [
            {"type": "video_intro", "video_url": "https://cdn/x/VID1.mp4",
             "duration_seconds": 60, "eyebrow_label": "VIDEO 1"},
            {"type": "text_context", "body": "Contexto viejo."},
            {"type": "text_evidence", "body": "Evidencia vieja.", "citation": _CITATION},
            {"type": "text_solution", "body": "Solución vieja.", "requires_evidence_position": 3},
            copy.deepcopy(_QUIZ),
            {"type": "reflection_write", "prompt": "Reflexioná sobre esto.",
             "min_chars": 30, "max_chars": 500},
        ],
    }


def _ids(db: Session, unit_id: Any) -> list[Any]:
    return [
        ub.id for ub in db.scalars(
            select(UnitBlock).where(UnitBlock.unit_id == unit_id).order_by(UnitBlock.position)
        )
    ]


def _attempt_with_progress(db: Session, factory: Any, unit: LearningUnit) -> LearningUnitAttempt:
    org = factory.make_org()
    user = factory.make_user(org=org)
    attempt = LearningUnitAttempt(user_id=user.id, unit_id=unit.id, org_id=org.id)
    db.add(attempt)
    db.flush()
    for ub in db.scalars(select(UnitBlock).where(UnitBlock.unit_id == unit.id)):
        db.add(BlockProgress(
            attempt_id=attempt.id, unit_block_id=ub.id, status=BlockProgressStatus.completed
        ))
    refl = db.scalars(select(ReflectionBlock)).first()
    assert refl is not None
    db.add(ReflectionText(
        attempt_id=attempt.id, reflection_block_id=refl.id, text="x" * 40,
    ))
    db.flush()
    return attempt


def test_in_place_keeps_unit_and_block_ids_and_user_progress(factory: Any, db: Session) -> None:
    unit = upsert_unit_from_dict(db, _unit())
    original_unit_id = unit.id
    ids_before = _ids(db, unit.id)
    attempt = _attempt_with_progress(db, factory, unit)
    progress_before = db.scalar(select(func.count()).select_from(BlockProgress)) or 0

    new = _unit()
    new["title"] = "Actualizado"
    new["blocks"][1] = {
        "type": "text_context", "body": "Contexto NUEVO.",
        "presentation": {"template": "stat", "tone": "green"},
        "hero_stat": {"value": "30 s", "label": "mínimo", "source": "HG"},
    }
    report = update_unit_in_place(db, unit, new)

    assert report.matched == 6 and report.added == 0 and report.removed == 0
    assert report.block_progress_lost == 0
    assert report.validation_errors == []
    # misma unit, mismos ids de bloque, mismo orden
    assert unit.id == original_unit_id and unit.title == "Actualizado"
    assert _ids(db, unit.id) == ids_before
    # contenido reescrito, incluida la capa de presentación
    ctx = db.scalar(
        select(TextBlock).join(UnitBlock, UnitBlock.block_id == TextBlock.id)
        .where(UnitBlock.unit_id == unit.id, UnitBlock.position == 2)
    )
    assert ctx is not None and ctx.body == "Contexto NUEVO."
    assert ctx.presentation and ctx.hero_stat
    # progreso del usuario intacto
    assert db.get(LearningUnitAttempt, attempt.id) is not None
    assert (db.scalar(select(func.count()).select_from(BlockProgress)) or 0) == progress_before
    assert db.scalar(select(func.count()).select_from(ReflectionText)) == 1


def test_in_place_solution_keeps_link_to_evidence(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _unit("hg-p2-l1-997-inplace-link"))
    update_unit_in_place(db, unit, _unit("hg-p2-l1-997-inplace-link"))
    ev = db.scalar(
        select(TextBlock).join(UnitBlock, UnitBlock.block_id == TextBlock.id)
        .where(UnitBlock.unit_id == unit.id, UnitBlock.position == 3)
    )
    sol = db.scalar(
        select(TextBlock).join(UnitBlock, UnitBlock.block_id == TextBlock.id)
        .where(UnitBlock.unit_id == unit.id, UnitBlock.position == 4)
    )
    assert ev is not None and sol is not None
    assert sol.requires_evidence_block_id == ev.id


def test_in_place_adds_and_removes_blocks_and_reports_lost_progress(
    factory: Any, db: Session
) -> None:
    unit = upsert_unit_from_dict(db, _unit("hg-p2-l1-996-inplace-diff"))
    _attempt_with_progress(db, factory, unit)

    new = _unit("hg-p2-l1-996-inplace-diff")
    new["blocks"] = [b for b in new["blocks"] if b["type"] != "quiz_recall"]  # se quita el quiz
    new["blocks"].insert(  # se agrega un video_teaching
        1, {"type": "video_teaching", "video_url": "https://cdn/x/VID2.mp4",
            "duration_seconds": 60, "eyebrow_label": "VIDEO 2"},
    )
    new["blocks"][4]["requires_evidence_position"] = 4  # la evidence pasó a la posición 4
    report = update_unit_in_place(db, unit, new)

    assert (report.matched, report.added, report.removed) == (5, 1, 1)
    assert report.block_progress_lost == 1  # el del quiz eliminado
    assert [ub.position for ub in db.scalars(
        select(UnitBlock).where(UnitBlock.unit_id == unit.id).order_by(UnitBlock.position)
    )] == [1, 2, 3, 4, 5, 6]


def test_in_place_quiz_questions_are_replaced_and_counted(db: Session) -> None:
    unit = upsert_unit_from_dict(db, _unit("hg-p2-l1-995-inplace-quiz"))
    new = _unit("hg-p2-l1-995-inplace-quiz")
    new["blocks"][4] = {
        "type": "quiz_recall",
        "questions": [
            {"type": "true_false", "prompt": "Nueva 1", "correct_answer": False,
             "explanation_true": "a", "explanation_false": "b"},
            {"type": "true_false", "prompt": "Nueva 2", "correct_answer": True,
             "explanation_true": "a", "explanation_false": "b"},
        ],
    }
    report = update_unit_in_place(db, unit, new)
    assert report.quiz_questions_replaced == 1
    prompts = sorted(db.scalars(
        select(QuizQuestion.prompt).join(UnitBlock, UnitBlock.block_id == QuizQuestion.quiz_block_id)
        .where(UnitBlock.unit_id == unit.id)
    ))
    assert prompts == ["Nueva 1", "Nueva 2"]


def test_in_place_reports_validation_errors_without_touching_published_at(db: Session) -> None:
    from hg.modules.learning_units.services import try_publish

    unit = upsert_unit_from_dict(db, _unit("hg-p2-l1-994-inplace-pub"))
    assert try_publish(db, unit) == []
    published_at = unit.published_at
    assert published_at is not None

    bad = _unit("hg-p2-l1-994-inplace-pub")
    bad["blocks"][2] = {"type": "text_evidence", "body": "Sin citación."}
    bad["blocks"][3] = {"type": "text_solution", "body": "Sol."}  # ya no referencia evidence
    report = update_unit_in_place(db, unit, bad)

    assert report.validation_errors  # el caller decide (rollback si estaba publicada)
    assert unit.published_at == published_at
