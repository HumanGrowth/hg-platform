"""Admin CMS router: CRUD de units/bloques + validación de publish (TASK A-05).

Todo bajo ``require_role("superadmin")`` + ``get_db_as_superadmin`` (BYPASSRLS,
cross-tenant — igual que ``hg.modules.admin.router``). El contenido de
Learning Units es global, no hay tenant que resolver acá.

Semántica de "block_id" — deliberadamente distinta entre endpoints, tal como
la especifica el prompt:

- ``POST .../blocks`` y ``DELETE /blocks/{block_id}`` y el reorder operan
  sobre ``unit_blocks.id`` (el índice ordenado dentro de una unit).
- ``PATCH /blocks/{block_type}/{block_id}`` opera sobre el ID propio del
  template (``video_blocks.id`` / ``text_blocks.id`` / etc.) — no necesita
  saber a qué unit pertenece, los templates son reusables entre units.
"""
from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import TypeAdapter
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.identity.models import User
from hg.modules.learning_units.models import (
    LearningUnit,
    QuizBlock,
    QuizFillBlankAnswer,
    QuizMatchingPair,
    QuizMultipleChoiceConfig,
    QuizOption,
    QuizOrderingItem,
    QuizQuestion,
    QuizScoringMode,
    ReflectionBlock,
    TextBlock,
    TextBlockVariant,
    UnitBlock,
    UnitBlockType,
    VideoBlock,
)
from hg.modules.learning_units.router import _build_block_union, _load_unit_detail
from hg.modules.learning_units.schemas import (
    BlockCreate,
    BlockReorderRequest,
    LearningUnitCreate,
    LearningUnitDetail,
    LearningUnitUpdate,
    QuizBlockCreate,
    QuizQuestionCreateUnion,
    QuizQuestionFillBlankCreate,
    QuizQuestionMatchingCreate,
    QuizQuestionMultipleChoiceCreate,
    QuizQuestionOrderingCreate,
    QuizQuestionSingleChoiceCreate,
    QuizQuestionTrueFalseCreate,
    ReflectionBlockCreate,
    TextBlockCreate,
    VideoBlockCreate,
)

router = APIRouter()

_QUESTION_ADAPTER: TypeAdapter[Any] = TypeAdapter(QuizQuestionCreateUnion)


def _unit_or_404(db: Session, unit_id: uuid.UUID) -> LearningUnit:
    unit = db.get(LearningUnit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unit not found")
    return unit


# ─────────────────────────── Unit CRUD ───────────────────────────


@router.post("/learning-units", response_model=LearningUnitDetail, status_code=status.HTTP_201_CREATED)
def create_unit(
    body: LearningUnitCreate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> LearningUnitDetail:
    if db.scalar(select(LearningUnit).where(LearningUnit.slug == body.slug)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="slug already exists")
    unit = LearningUnit(**body.model_dump())
    db.add(unit)
    db.flush()
    db.refresh(unit)
    return _load_unit_detail(db, unit)


@router.patch("/learning-units/{unit_id}", response_model=LearningUnitDetail)
def update_unit(
    unit_id: uuid.UUID,
    body: LearningUnitUpdate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> LearningUnitDetail:
    unit = _unit_or_404(db, unit_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)
    unit.updated_at = datetime.now(UTC)
    db.flush()
    db.refresh(unit)
    return _load_unit_detail(db, unit)


@router.delete("/learning-units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> None:
    unit = _unit_or_404(db, unit_id)
    if unit.published_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="unit is published — unpublish it first",
        )
    db.delete(unit)
    db.flush()


# ─────────────────────────── Publish / unpublish ───────────────────────────


def _validate_for_publish(db: Session, unit: LearningUnit) -> list[str]:
    """Devuelve la lista completa de errores (no fail-fast) — TASK A-05."""
    errors: list[str] = []

    dup = db.scalar(
        select(LearningUnit).where(LearningUnit.slug == unit.slug, LearningUnit.id != unit.id)
    )
    if dup is not None:
        errors.append(f"slug '{unit.slug}' ya está en uso por otra unit")

    blocks = sorted(unit.blocks, key=lambda b: b.position)
    if not any(b.block_type in (UnitBlockType.video_intro, UnitBlockType.video_teaching, UnitBlockType.video_closing) for b in blocks):
        errors.append("falta al menos 1 bloque de video (video_intro/video_teaching/video_closing)")

    evidence_ids: set[uuid.UUID] = set()
    has_valid_evidence = False
    for b in blocks:
        if b.block_type != UnitBlockType.text_evidence:
            continue
        text = db.get(TextBlock, b.block_id)
        if text is None:
            continue
        evidence_ids.add(text.id)
        doi = (text.citation or {}).get("doi_or_url") if text.citation else None
        if doi:
            has_valid_evidence = True
    if not has_valid_evidence:
        errors.append("falta al menos 1 bloque text_evidence con citation.doi_or_url no vacío")

    has_valid_solution = False
    for b in blocks:
        if b.block_type != UnitBlockType.text_solution:
            continue
        text = db.get(TextBlock, b.block_id)
        if text is not None and text.requires_evidence_block_id in evidence_ids:
            has_valid_solution = True
    if not has_valid_solution:
        errors.append(
            "falta al menos 1 bloque text_solution con requires_evidence_block_id "
            "apuntando a un text_evidence de la misma unit"
        )

    has_required_retrieval = any(
        b.required and b.block_type in (UnitBlockType.quiz_recall, UnitBlockType.reflection_write)
        for b in blocks
    )
    if not has_required_retrieval:
        errors.append("falta al menos 1 bloque quiz_recall o reflection_write con required=true")

    for b in blocks:
        if b.block_type != UnitBlockType.quiz_recall:
            continue
        quiz = db.get(QuizBlock, b.block_id)
        if quiz is None:
            continue
        for q in quiz.questions:
            if q.question_type in ("single_choice", "multiple_choice"):
                for opt in q.options:
                    if not opt.explanation or not opt.explanation.strip():
                        errors.append(
                            f"pregunta '{q.prompt[:40]}...' tiene una opción sin explanation"
                        )
                        break

    return errors


@router.post("/learning-units/{unit_id}/publish", response_model=LearningUnitDetail)
def publish_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> LearningUnitDetail:
    unit = _unit_or_404(db, unit_id)
    errors = _validate_for_publish(db, unit)
    if errors:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail={"errors": errors})
    unit.published_at = datetime.now(UTC)
    db.flush()
    db.refresh(unit)
    return _load_unit_detail(db, unit)


@router.post("/learning-units/{unit_id}/unpublish", response_model=LearningUnitDetail)
def unpublish_unit(
    unit_id: uuid.UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> LearningUnitDetail:
    unit = _unit_or_404(db, unit_id)
    unit.published_at = None
    db.flush()
    db.refresh(unit)
    return _load_unit_detail(db, unit)


# ─────────────────────────── Blocks ───────────────────────────


def _create_question(db: Session, quiz_block_id: uuid.UUID, position: int, q: QuizQuestionCreateUnion) -> None:
    question = QuizQuestion(
        quiz_block_id=quiz_block_id, position=position, question_type=q.question_type, prompt=q.prompt
    )
    db.add(question)
    db.flush()

    if isinstance(q, QuizQuestionSingleChoiceCreate | QuizQuestionMultipleChoiceCreate):
        for i, opt in enumerate(q.options, start=1):
            db.add(QuizOption(
                question_id=question.id, position=i, text=opt.text,
                is_correct=opt.is_correct, explanation=opt.explanation,
            ))
        if isinstance(q, QuizQuestionMultipleChoiceCreate):
            db.add(QuizMultipleChoiceConfig(question_id=question.id, scoring=QuizScoringMode(q.scoring)))
    elif isinstance(q, QuizQuestionTrueFalseCreate):
        from hg.modules.learning_units.models import QuizTrueFalse
        db.add(QuizTrueFalse(
            question_id=question.id, correct_answer=q.correct_answer,
            explanation_true=q.explanation_true, explanation_false=q.explanation_false,
        ))
    elif isinstance(q, QuizQuestionOrderingCreate):
        for i, item in enumerate(q.items, start=1):
            db.add(QuizOrderingItem(
                question_id=question.id, text=item.text, correct_position=i, explanation=item.explanation
            ))
    elif isinstance(q, QuizQuestionMatchingCreate):
        for pair in q.pairs:
            db.add(QuizMatchingPair(
                question_id=question.id, left_text=pair.left_text, right_text=pair.right_text,
                is_distractor=pair.is_distractor,
            ))
    elif isinstance(q, QuizQuestionFillBlankCreate):
        for i, ans in enumerate(q.answers, start=1):
            db.add(QuizFillBlankAnswer(
                question_id=question.id, position=i, correct_text=ans.correct_text,
                accept_variants=ans.accept_variants, case_sensitive=ans.case_sensitive,
            ))
    else:
        raise AssertionError(f"unknown question create type {type(q)!r}")


def _resolve_evidence_template_id(db: Session, unit_id: uuid.UUID, unit_block_id: uuid.UUID) -> uuid.UUID:
    """``TextBlockCreate.requires_evidence_block_id`` llega como el id que el
    caller ya vio (``unit_blocks.id`` — el mismo "id" que devuelve cualquier
    ``BlockRead``/``create_block``), no como el PK interno de ``text_blocks``
    al que apunta el FK real. Lo resolvemos acá para no filtrar ese detalle
    interno al CMS — matchea cómo el resto de la API identifica bloques."""
    unit_block = db.get(UnitBlock, unit_block_id)
    if (
        unit_block is None
        or unit_block.unit_id != unit_id
        or unit_block.block_type != UnitBlockType.text_evidence
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="requires_evidence_block_id debe ser el id de un bloque text_evidence de esta misma unit",
        )
    return unit_block.block_id


def _create_block_content(db: Session, unit_id: uuid.UUID, payload: BlockCreate) -> uuid.UUID:
    """Crea el template row correspondiente. Devuelve el id del template."""
    if isinstance(payload, VideoBlockCreate):
        video = VideoBlock(
            youtube_video_id=payload.youtube_video_id, poster_url=payload.poster_url,
            duration_seconds=payload.duration_seconds, subtitle_url=payload.subtitle_url,
            transcript_text=payload.transcript_text, eyebrow_label=payload.eyebrow_label,
        )
        db.add(video)
        db.flush()
        return video.id
    if isinstance(payload, TextBlockCreate):
        evidence_template_id = (
            _resolve_evidence_template_id(db, unit_id, payload.requires_evidence_block_id)
            if payload.requires_evidence_block_id is not None
            else None
        )
        text = TextBlock(
            variant=TextBlockVariant(payload.variant), eyebrow=payload.eyebrow, body=payload.body,
            citation=payload.citation.model_dump() if payload.citation else None,
            applies_to=payload.applies_to, requires_evidence_block_id=evidence_template_id,
        )
        db.add(text)
        db.flush()
        return text.id
    if isinstance(payload, QuizBlockCreate):
        quiz = QuizBlock(eyebrow=payload.eyebrow)
        db.add(quiz)
        db.flush()
        for i, q in enumerate(payload.questions, start=1):
            _create_question(db, quiz.id, i, q)
        db.flush()
        return quiz.id
    if isinstance(payload, ReflectionBlockCreate):
        reflection = ReflectionBlock(
            eyebrow=payload.eyebrow, prompt=payload.prompt, min_chars=payload.min_chars,
            max_chars=payload.max_chars, example=payload.example,
        )
        db.add(reflection)
        db.flush()
        return reflection.id
    raise AssertionError(f"unknown block create type {type(payload)!r}")


@router.post("/learning-units/{unit_id}/blocks", status_code=status.HTTP_201_CREATED)
def create_block(
    unit_id: uuid.UUID,
    payload: BlockCreate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> Any:
    unit = _unit_or_404(db, unit_id)
    template_id = _create_block_content(db, unit.id, payload)
    unit_block = UnitBlock(
        unit_id=unit.id, position=payload.position, block_type=UnitBlockType(payload.block_type),
        block_id=template_id, required=payload.required,
    )
    db.add(unit_block)
    db.flush()
    db.refresh(unit_block)
    return _build_block_union(db, unit_block)


@router.patch("/blocks/{block_type}/{block_id}")
def update_block_content(
    block_type: str,
    block_id: uuid.UUID,
    body: dict[str, Any],
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> Any:
    try:
        parsed_type = UnitBlockType(block_type)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid block_type") from None

    obj: VideoBlock | TextBlock | QuizBlock | ReflectionBlock | None
    if parsed_type in (UnitBlockType.video_intro, UnitBlockType.video_teaching, UnitBlockType.video_closing):
        obj = db.get(VideoBlock, block_id)
        allowed = {
            "youtube_video_id", "poster_url", "duration_seconds", "subtitle_url",
            "transcript_text", "eyebrow_label",
        }
    elif parsed_type in (UnitBlockType.text_context, UnitBlockType.text_evidence, UnitBlockType.text_solution):
        obj = db.get(TextBlock, block_id)
        allowed = {"eyebrow", "body", "citation", "applies_to", "requires_evidence_block_id"}
    elif parsed_type == UnitBlockType.quiz_recall:
        obj = db.get(QuizBlock, block_id)
        allowed = {"eyebrow", "questions"}
    elif parsed_type == UnitBlockType.reflection_write:
        obj = db.get(ReflectionBlock, block_id)
        allowed = {"eyebrow", "prompt", "min_chars", "max_chars", "example"}
    else:  # pragma: no cover — cubierto por los 8 valores de UnitBlockType
        raise AssertionError

    if obj is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="block not found")

    unknown = set(body) - allowed
    if unknown:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"unknown fields: {sorted(unknown)}")

    if parsed_type == UnitBlockType.quiz_recall and "questions" in body:
        questions = [_QUESTION_ADAPTER.validate_python(q) for q in body.pop("questions")]
        db.query(QuizQuestion).filter(QuizQuestion.quiz_block_id == obj.id).delete()
        db.flush()
        for i, q in enumerate(questions, start=1):
            _create_question(db, obj.id, i, q)

    for field, value in body.items():
        setattr(obj, field, value)
    db.flush()
    db.refresh(obj)
    return {"ok": True, "block_type": block_type, "id": str(obj.id)}


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_block(
    block_id: uuid.UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> None:
    unit_block = db.get(UnitBlock, block_id)
    if unit_block is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="block not found")

    template_model = {
        UnitBlockType.video_intro: VideoBlock, UnitBlockType.video_teaching: VideoBlock,
        UnitBlockType.video_closing: VideoBlock,
        UnitBlockType.text_context: TextBlock, UnitBlockType.text_evidence: TextBlock,
        UnitBlockType.text_solution: TextBlock,
        UnitBlockType.quiz_recall: QuizBlock,
        UnitBlockType.reflection_write: ReflectionBlock,
    }[unit_block.block_type]
    template = db.get(template_model, unit_block.block_id)

    db.delete(unit_block)
    db.flush()
    if template is not None:
        db.delete(template)
        db.flush()


@router.post("/learning-units/{unit_id}/blocks/reorder", response_model=LearningUnitDetail)
def reorder_blocks(
    unit_id: uuid.UUID,
    body: BlockReorderRequest,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> LearningUnitDetail:
    unit = _unit_or_404(db, unit_id)
    existing_ids = {b.id for b in unit.blocks}
    if set(body.block_ids) != existing_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="block_ids debe incluir exactamente todos los bloques de la unit, sin repetir",
        )

    blocks_by_id = {b.id: b for b in unit.blocks}
    # Bump a un rango negativo temporal primero para no violar
    # uq (unit_id, position) al reordenar in-place.
    for offset, block_id in enumerate(body.block_ids, start=1):
        blocks_by_id[block_id].position = -offset
    db.flush()
    for position, block_id in enumerate(body.block_ids, start=1):
        blocks_by_id[block_id].position = position
    db.flush()
    db.refresh(unit)
    return _load_unit_detail(db, unit)
