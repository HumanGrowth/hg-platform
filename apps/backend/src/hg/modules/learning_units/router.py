"""Consumer router: feed + detail + attempts + quiz/reflection submit (TASK A-04).

Todos los endpoints requieren user autenticado (``get_current_user``). El
contenido (``learning_units`` + bloques) es catálogo global sin RLS, pero se
consulta bajo ``hg_app`` igual que el progreso — no hace falta una segunda
sesión ``hg_superadmin`` porque el grant ya cubre ``hg_app`` en ambas
familias de tablas (ver docstring de la migración LU-01). El aislamiento de
``learning_unit_attempts`` lo impone RLS; el de sus tres hijas
(``block_progress``/``quiz_responses``/``reflection_texts``) lo impone este
router verificando ``attempt.user_id == current_user.id`` antes de tocarlas.
"""
from __future__ import annotations

import random
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User
from hg.modules.learning.models import CareerPath, Enrollment
from hg.modules.learning_units import quiz_grading
from hg.modules.learning_units.models import (
    BLOCK_TYPE_TO_MODEL,
    BlockProgress,
    BlockProgressStatus,
    LearningUnit,
    LearningUnitAttempt,
    QuizBlock,
    QuizQuestion,
    QuizResponse,
    ReflectionBlock,
    ReflectionText,
    TextBlock,
    UnitBlock,
    UnitBlockType,
    VideoBlock,
)
from hg.modules.learning_units.schemas import (
    BlockProgressOut,
    LearningUnitAttemptOut,
    LearningUnitDetail,
    LearningUnitFeed,
    LearningUnitFeedItem,
    MatchingItemOut,
    OrderingItemOut,
    QuizBlockRead,
    QuizOptionOut,
    QuizQuestionFillBlank,
    QuizQuestionMatching,
    QuizQuestionMultipleChoice,
    QuizQuestionOrdering,
    QuizQuestionSingleChoice,
    QuizQuestionTrueFalse,
    QuizSubmitRequest,
    QuizSubmitResponse,
    QuizSubmitResult,
    ReflectionBlockRead,
    ReflectionSubmitIn,
    ReflectionSubmitOut,
    TextBlockRead,
    VideoBlockRead,
)

router = APIRouter()

_VIDEO_TYPES = {UnitBlockType.video_intro, UnitBlockType.video_teaching, UnitBlockType.video_closing}


# ─────────────────────────── Helpers ───────────────────────────


def _published_unit_or_404(db: Session, slug: str) -> LearningUnit:
    unit = db.scalar(
        select(LearningUnit).where(LearningUnit.slug == slug, LearningUnit.published_at.isnot(None))
    )
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unit not found")
    return unit


def _get_attempt(db: Session, unit_id: uuid.UUID, user: User) -> LearningUnitAttempt | None:
    return db.scalar(
        select(LearningUnitAttempt).where(
            LearningUnitAttempt.unit_id == unit_id, LearningUnitAttempt.user_id == user.id
        )
    )


def _own_attempt_or_404(db: Session, unit: LearningUnit, user: User) -> LearningUnitAttempt:
    attempt = _get_attempt(db, unit.id, user)
    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="attempt not started — call /attempts/start first"
        )
    return attempt


def _build_matching_items(question: QuizQuestion) -> tuple[list[MatchingItemOut], list[MatchingItemOut]]:
    """Pairs no-distractor comparten id en left/right (lo usa quiz_grading para
    calificar); distractors generan ids únicos por lado para que nunca puedan
    "matchear" correctamente entre sí."""
    left: list[MatchingItemOut] = []
    right: list[MatchingItemOut] = []
    for pair in question.matching_pairs:
        if pair.is_distractor:
            left.append(MatchingItemOut(id=f"{pair.id}-L", text=pair.left_text))
            right.append(MatchingItemOut(id=f"{pair.id}-R", text=pair.right_text))
        else:
            left.append(MatchingItemOut(id=str(pair.id), text=pair.left_text))
            right.append(MatchingItemOut(id=str(pair.id), text=pair.right_text))
    random.shuffle(left)
    random.shuffle(right)
    return left, right


def _build_question_union(question: QuizQuestion):  # union de 6 tipos, ver schemas
    base = {"id": question.id, "position": question.position, "prompt": question.prompt}
    qtype = question.question_type.value if hasattr(question.question_type, "value") else question.question_type
    if qtype == "single_choice":
        options = sorted(question.options, key=lambda o: o.position)
        return QuizQuestionSingleChoice(
            **base, question_type="single_choice",
            options=[QuizOptionOut(id=o.id, position=o.position, text=o.text) for o in options],
        )
    if qtype == "multiple_choice":
        options = sorted(question.options, key=lambda o: o.position)
        scoring = question.multiple_choice_config.scoring.value if question.multiple_choice_config else "partial"
        return QuizQuestionMultipleChoice(
            **base, question_type="multiple_choice",
            options=[QuizOptionOut(id=o.id, position=o.position, text=o.text) for o in options],
            scoring=scoring,
        )
    if qtype == "true_false":
        return QuizQuestionTrueFalse(**base, question_type="true_false")
    if qtype == "ordering":
        items = list(question.ordering_items)
        random.shuffle(items)
        return QuizQuestionOrdering(
            **base, question_type="ordering",
            items=[OrderingItemOut(id=i.id, text=i.text) for i in items],
        )
    if qtype == "matching":
        left, right = _build_matching_items(question)
        return QuizQuestionMatching(**base, question_type="matching", left_items=left, right_items=right)
    if qtype == "fill_blank":
        return QuizQuestionFillBlank(
            **base, question_type="fill_blank", blanks_count=len(question.fill_blank_answers)
        )
    raise AssertionError(f"unknown question_type {qtype!r}")


def _build_block_union(db: Session, unit_block: UnitBlock):  # union de 4 tipos
    model = BLOCK_TYPE_TO_MODEL[unit_block.block_type]
    content = db.get(model, unit_block.block_id)
    if content is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"dangling block reference {unit_block.block_id}",
        )
    base = {"id": unit_block.id, "position": unit_block.position, "required": unit_block.required}
    btype = unit_block.block_type.value if hasattr(unit_block.block_type, "value") else unit_block.block_type

    if isinstance(content, VideoBlock):
        return VideoBlockRead(
            **base, block_type=btype, video_url=content.video_url,
            poster_url=content.poster_url, duration_seconds=content.duration_seconds,
            subtitle_url=content.subtitle_url, transcript_text=content.transcript_text,
            eyebrow_label=content.eyebrow_label,
        )
    if isinstance(content, TextBlock):
        variant = content.variant.value if hasattr(content.variant, "value") else content.variant
        return TextBlockRead(
            **base, block_type=btype, variant=variant, eyebrow=content.eyebrow, body=content.body,
            citation=content.citation, applies_to=content.applies_to,
            requires_evidence_block_id=content.requires_evidence_block_id,
        )
    if isinstance(content, QuizBlock):
        questions = sorted(content.questions, key=lambda q: q.position)
        return QuizBlockRead(
            **base, block_type=btype, eyebrow=content.eyebrow,
            questions=[_build_question_union(q) for q in questions],
        )
    if isinstance(content, ReflectionBlock):
        return ReflectionBlockRead(
            **base, block_type=btype, eyebrow=content.eyebrow, prompt=content.prompt,
            min_chars=content.min_chars, max_chars=content.max_chars, example=content.example,
        )
    raise AssertionError(f"unhandled block content type {type(content)!r}")


def _load_unit_detail(db: Session, unit: LearningUnit) -> LearningUnitDetail:
    blocks = sorted(unit.blocks, key=lambda b: b.position)
    return LearningUnitDetail(
        id=unit.id, slug=unit.slug, title=unit.title, pillar_code=unit.pillar_code,
        competency_code=unit.competency_code.value if unit.competency_code else None,
        level_code=unit.level_code, mentor_id=unit.mentor_id, published_at=unit.published_at,
        estimated_duration_seconds=unit.estimated_duration_seconds,
        blocks=[_build_block_union(db, b) for b in blocks],
    )


def _attempt_status(attempt: LearningUnitAttempt | None) -> str:
    if attempt is None or attempt.started_at is None:
        return "not_started"
    return "completed" if attempt.completed_at else "in_progress"


def _feed_item(db: Session, unit: LearningUnit, user: User) -> LearningUnitFeedItem:
    attempt = _get_attempt(db, unit.id, user)
    n_blocks = len(unit.blocks)
    first_video_block = next(
        (b for b in sorted(unit.blocks, key=lambda b: b.position) if b.block_type in _VIDEO_TYPES), None
    )
    poster_url = None
    if first_video_block is not None:
        video = db.get(VideoBlock, first_video_block.block_id)
        poster_url = video.poster_url if video else None
    return LearningUnitFeedItem(
        id=unit.id, slug=unit.slug, title=unit.title, pillar_code=unit.pillar_code,
        level_code=unit.level_code, estimated_duration_seconds=unit.estimated_duration_seconds,
        blocks_count=n_blocks, attempt_status=_attempt_status(attempt), poster_url=poster_url,
    )


def _select_feed_units(db: Session, user: User) -> tuple[LearningUnit | None, list[LearningUnit]]:
    """Selección del "unit del día" — versión MVP (decisión doc §"Selección del
    unit del día"): (1) attempt in_progress existente, si no (3) fallback a
    units publicadas no completadas del pillar de una enrollment activa (o
    cualquier publicada si no hay enrollments). El ranking por pillar_score
    más rezagado (paso 2) queda deferred a Fase 2."""
    in_progress_attempt = db.scalar(
        select(LearningUnitAttempt).where(
            LearningUnitAttempt.user_id == user.id,
            LearningUnitAttempt.started_at.isnot(None),
            LearningUnitAttempt.completed_at.is_(None),
        )
    )
    hero: LearningUnit | None = None
    if in_progress_attempt is not None:
        hero = db.get(LearningUnit, in_progress_attempt.unit_id)

    completed_unit_ids = set(
        db.scalars(
            select(LearningUnitAttempt.unit_id).where(
                LearningUnitAttempt.user_id == user.id, LearningUnitAttempt.completed_at.isnot(None)
            )
        ).all()
    )

    enrolled_pillars = list(
        db.scalars(
            select(CareerPath.code)
            .join(Enrollment, Enrollment.career_path_id == CareerPath.id)
            .where(Enrollment.user_id == user.id, Enrollment.is_active.is_(True))
        ).all()
    )

    candidates_q = select(LearningUnit).where(LearningUnit.published_at.isnot(None))
    if completed_unit_ids:
        candidates_q = candidates_q.where(LearningUnit.id.notin_(completed_unit_ids))
    if enrolled_pillars:
        candidates_q = candidates_q.where(LearningUnit.pillar_code.in_(enrolled_pillars))
    candidates = list(db.scalars(candidates_q.order_by(LearningUnit.created_at)).all())

    if hero is None and candidates:
        hero = candidates[random.randrange(len(candidates))]

    next_units = [u for u in candidates if hero is None or u.id != hero.id]
    return hero, next_units


# ─────────────────────────── Endpoints ───────────────────────────


@router.get("/modulos/feed", response_model=LearningUnitFeed)
def get_feed(
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitFeed:
    hero, next_units = _select_feed_units(db, current_user)
    hero_item = _feed_item(db, hero, current_user) if hero else None
    next_items = [_feed_item(db, u, current_user) for u in next_units[:limit]]
    return LearningUnitFeed(hero=hero_item, next=next_items)


@router.get("/modulos/{slug}", response_model=LearningUnitDetail)
def get_unit_detail(
    slug: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> LearningUnitDetail:
    unit = _published_unit_or_404(db, slug)
    return _load_unit_detail(db, unit)


@router.post("/modulos/{slug}/attempts/start", response_model=LearningUnitAttemptOut)
def start_attempt(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitAttempt:
    unit = _published_unit_or_404(db, slug)
    attempt = _get_attempt(db, unit.id, current_user)
    now = datetime.now(UTC)

    if attempt is None:
        attempt = LearningUnitAttempt(
            user_id=current_user.id, unit_id=unit.id, org_id=current_user.org_id, started_at=now
        )
        db.add(attempt)
        db.flush()
    elif attempt.completed_at is not None:
        # Replay libre (decisión H): resetea el attempt existente, misma row/ID.
        attempt.completed_at = None
        attempt.started_at = now
        db.query(BlockProgress).filter(BlockProgress.attempt_id == attempt.id).delete()
        db.query(QuizResponse).filter(QuizResponse.attempt_id == attempt.id).delete()
        db.query(ReflectionText).filter(ReflectionText.attempt_id == attempt.id).delete()
        db.flush()
    # Si ya existe y no está completo: idempotente, se devuelve tal cual.

    db.refresh(attempt)
    return attempt


@router.get("/modulos/{slug}/attempt", response_model=LearningUnitAttemptOut)
def get_attempt(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitAttempt:
    unit = _published_unit_or_404(db, slug)
    return _own_attempt_or_404(db, unit, current_user)


def _maybe_complete_unit(db: Session, unit: LearningUnit, attempt: LearningUnitAttempt) -> None:
    """Unit completa cuando todos los blocks required=true tienen block_progress
    completed. Setea completed_at una sola vez (no pisa completions previas)."""
    if attempt.completed_at is not None:
        return
    required_block_ids = {b.id for b in unit.blocks if b.required}
    if not required_block_ids:
        return
    completed_ids = set(
        db.scalars(
            select(BlockProgress.unit_block_id).where(
                BlockProgress.attempt_id == attempt.id,
                BlockProgress.status == BlockProgressStatus.completed,
                BlockProgress.unit_block_id.in_(required_block_ids),
            )
        ).all()
    )
    if required_block_ids <= completed_ids:
        attempt.completed_at = datetime.now(UTC)


def _unit_block_or_404(db: Session, unit: LearningUnit, block_id: uuid.UUID) -> UnitBlock:
    block = next((b for b in unit.blocks if b.id == block_id), None)
    if block is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="block not found in this unit")
    return block


def _upsert_block_progress(
    db: Session, attempt: LearningUnitAttempt, unit_block_id: uuid.UUID, status_: BlockProgressStatus
) -> BlockProgress:
    progress = db.scalar(
        select(BlockProgress).where(
            BlockProgress.attempt_id == attempt.id, BlockProgress.unit_block_id == unit_block_id
        )
    )
    now = datetime.now(UTC)
    if progress is None:
        progress = BlockProgress(
            attempt_id=attempt.id, unit_block_id=unit_block_id, status=status_, submitted_at=now
        )
        db.add(progress)
    else:
        progress.status = status_
        progress.submitted_at = now
    db.flush()
    return progress


@router.post("/modulos/{slug}/blocks/{block_id}/complete", response_model=BlockProgressOut)
def complete_block(
    slug: str,
    block_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BlockProgress:
    unit = _published_unit_or_404(db, slug)
    unit_block = _unit_block_or_404(db, unit, block_id)
    if unit_block.block_type in (UnitBlockType.quiz_recall, UnitBlockType.reflection_write):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quiz_recall/reflection_write se completan vía sus propios endpoints /submit",
        )
    attempt = _own_attempt_or_404(db, unit, current_user)
    progress = _upsert_block_progress(db, attempt, unit_block.id, BlockProgressStatus.completed)
    _maybe_complete_unit(db, unit, attempt)
    db.flush()
    db.refresh(progress)
    return progress


@router.post("/modulos/{slug}/blocks/{block_id}/quiz/submit", response_model=QuizSubmitResponse)
def submit_quiz(
    slug: str,
    block_id: uuid.UUID,
    payload: QuizSubmitRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> QuizSubmitResponse:
    unit = _published_unit_or_404(db, slug)
    unit_block = _unit_block_or_404(db, unit, block_id)
    if unit_block.block_type != UnitBlockType.quiz_recall:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="block is not a quiz_recall")
    attempt = _own_attempt_or_404(db, unit, current_user)

    quiz_block = db.get(QuizBlock, unit_block.block_id)
    if quiz_block is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="dangling quiz block")
    questions_by_id = {q.id: q for q in quiz_block.questions}
    if not payload.responses or {r.question_id for r in payload.responses} != set(questions_by_id):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="debés responder todas las preguntas del bloque",
        )

    results: list[QuizSubmitResult] = []
    for item in payload.responses:
        question = questions_by_id[item.question_id]
        is_correct, explanation, correct_answer = quiz_grading.grade(question, item)
        existing = db.scalar(
            select(QuizResponse).where(
                QuizResponse.attempt_id == attempt.id, QuizResponse.question_id == question.id
            )
        )
        response_data = item.model_dump(mode="json", exclude={"question_id", "question_type"})
        if existing is None:
            db.add(
                QuizResponse(
                    attempt_id=attempt.id, question_id=question.id, is_correct=is_correct,
                    response_data=response_data,
                )
            )
        else:
            existing.is_correct = is_correct
            existing.response_data = response_data
        results.append(
            QuizSubmitResult(
                question_id=question.id, is_correct=is_correct, explanation=explanation,
                correct_answer=correct_answer,
            )
        )

    _upsert_block_progress(db, attempt, unit_block.id, BlockProgressStatus.completed)
    _maybe_complete_unit(db, unit, attempt)
    db.flush()
    return QuizSubmitResponse(results=results, block_completed=True)


@router.post("/modulos/{slug}/blocks/{block_id}/reflection/submit", response_model=ReflectionSubmitOut)
def submit_reflection(
    slug: str,
    block_id: uuid.UUID,
    payload: ReflectionSubmitIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReflectionSubmitOut:
    unit = _published_unit_or_404(db, slug)
    unit_block = _unit_block_or_404(db, unit, block_id)
    if unit_block.block_type != UnitBlockType.reflection_write:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="block is not a reflection_write")
    attempt = _own_attempt_or_404(db, unit, current_user)

    reflection_block = db.get(ReflectionBlock, unit_block.block_id)
    if reflection_block is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="dangling reflection block")
    text = payload.text.strip()
    if not (reflection_block.min_chars <= len(text) <= reflection_block.max_chars):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"el texto debe tener entre {reflection_block.min_chars} y {reflection_block.max_chars} caracteres",
        )

    existing = db.scalar(
        select(ReflectionText).where(
            ReflectionText.attempt_id == attempt.id, ReflectionText.reflection_block_id == reflection_block.id
        )
    )
    if existing is None:
        db.add(ReflectionText(attempt_id=attempt.id, reflection_block_id=reflection_block.id, text=text))
    else:
        existing.text = text

    _upsert_block_progress(db, attempt, unit_block.id, BlockProgressStatus.completed)
    _maybe_complete_unit(db, unit, attempt)
    db.flush()
    return ReflectionSubmitOut()
