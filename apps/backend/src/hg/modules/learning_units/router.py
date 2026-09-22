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
from sqlalchemy import ColumnElement, select
from sqlalchemy import false as sa_false
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User
from hg.modules.learning_units import path_engine, quiz_grading
from hg.modules.learning_units.area_access import visible_units_predicate
from hg.modules.learning_units.dimensions import dimensions_for_career_paths
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
from hg.modules.learning_units.onboarding import (
    ONBOARDING_DIMENSION_CODE,
    build_onboarding_status,
    is_content_restricted,
)
from hg.modules.learning_units.schemas import (
    BlockProgressOut,
    LearningUnitAttemptOut,
    LearningUnitDetail,
    LearningUnitFeed,
    LearningUnitFeedItem,
    MatchingItemOut,
    OnboardingStatusOut,
    OnboardingUnitOut,
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
from hg.modules.learning_units.sequencing import (
    ENFORCED_ROLES,
    LOCK_LEVEL,
    LOCK_ORDER,
    LOCK_SCOPE,
    UnitSequence,
    build_sequence,
    unit_sort_key,
)

router = APIRouter()

_VIDEO_TYPES = {UnitBlockType.video_intro, UnitBlockType.video_teaching, UnitBlockType.video_closing}


# ─────────────────────────── Helpers ───────────────────────────


def _published_unit_or_404(db: Session, slug: str, user: User) -> LearningUnit:
    # Gating por Área (TASK 8): si el Área de la unit no está habilitada para la
    # Empresa del user, respondemos 404 (no 403) para no filtrar su existencia.
    unit = db.scalar(
        select(LearningUnit).where(
            LearningUnit.slug == slug,
            LearningUnit.published_at.isnot(None),
            visible_units_predicate(user),
        )
    )
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="unit not found")
    # Restricción de Onboarding: un colaborador/manager sin asignaciones
    # todavía solo puede tocar contenido de la dimensión "ON" (ver
    # `onboarding.py`). Acá sí es 403 (no 404) — a diferencia del gating por
    # Área, el user SABE que el resto del catálogo existe; el mensaje se lo
    # dice explícito en vez de fingir que no está.
    if unit.dimension_code != ONBOARDING_DIMENSION_CODE and is_content_restricted(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Completá el onboarding para acceder al resto del contenido",
        )
    return unit


_LOCK_MESSAGES = {
    LOCK_ORDER: "Este módulo se desbloquea al completar los anteriores de tu ruta",
    LOCK_LEVEL: "Este módulo es de un nivel superior al tuyo: se abre cuando tu nivel suba al reevaluarte",
    LOCK_SCOPE: "Este módulo pertenece a una dimensión fuera de tu ruta",
}


def _ensure_unlocked(db: Session, unit: LearningUnit, user: User) -> None:
    """Orden estricto y nivel: 403 si la unit todavía no se puede abrir. Se valida
    al abrir el detalle y al iniciar el attempt (el resto de endpoints exigen un
    attempt, que solo se crea acá). Excepciones (completadas, en curso, asignadas,
    ruta personalizada, niveles inferiores) y reglas en `sequencing`."""
    if user.role not in ENFORCED_ROLES:
        return
    reason = build_sequence(db, user).lock_reason(user, unit)
    if reason is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_LOCK_MESSAGES[reason])


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
            eyebrow_label=content.eyebrow_label, chapters=content.chapters,
        )
    if isinstance(content, TextBlock):
        variant = content.variant.value if hasattr(content.variant, "value") else content.variant
        return TextBlockRead(
            **base, block_type=btype, variant=variant, eyebrow=content.eyebrow, body=content.body,
            citation=content.citation, applies_to=content.applies_to,
            requires_evidence_block_id=content.requires_evidence_block_id,
            hero_stat=content.hero_stat, checklist_items=content.checklist_items,
            presentation=content.presentation,
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
        id=unit.id, slug=unit.slug, title=unit.title, dimension_code=unit.dimension_code,
        pillar_code=unit.pillar_code, unit_number=unit.unit_number,
        competency_code=unit.competency_code.value if unit.competency_code else None,
        level_code=unit.level_code, mentor_id=unit.mentor_id, published_at=unit.published_at,
        estimated_duration_seconds=unit.estimated_duration_seconds,
        narrative_tone=unit.narrative_tone, keywords=unit.keywords,
        blocks=[_build_block_union(db, b) for b in blocks],
    )


def _attempt_status(attempt: LearningUnitAttempt | None) -> str:
    if attempt is None or attempt.started_at is None:
        return "not_started"
    return "completed" if attempt.completed_at else "in_progress"


def _feed_item(
    db: Session, unit: LearningUnit, user: User, plan: UnitSequence | None = None
) -> LearningUnitFeedItem:
    attempt = _get_attempt(db, unit.id, user)
    n_blocks = len(unit.blocks)
    first_video_block = next(
        (b for b in sorted(unit.blocks, key=lambda b: b.position) if b.block_type in _VIDEO_TYPES), None
    )
    poster_url = None
    video_url = None
    if first_video_block is not None:
        video = db.get(VideoBlock, first_video_block.block_id)
        poster_url = video.poster_url if video else None
        video_url = video.video_url if video else None
    reason = plan.lock_reason(user, unit) if plan is not None else None
    return LearningUnitFeedItem(
        id=unit.id, slug=unit.slug, title=unit.title, dimension_code=unit.dimension_code,
        pillar_code=unit.pillar_code, unit_number=unit.unit_number,
        level_code=unit.level_code, estimated_duration_seconds=unit.estimated_duration_seconds,
        blocks_count=n_blocks, attempt_status=_attempt_status(attempt),
        poster_url=poster_url, video_url=video_url, keywords=unit.keywords,
        locked=reason is not None,
        lock_reason=reason,
    )


def _select_feed_units(
    db: Session, user: User, plan: UnitSequence, limit: int
) -> tuple[LearningUnit | None, list[LearningUnit]]:
    """Selección del "unit del día": (1) el módulo en curso más reciente; si no,
    (2) el `next_step` de Mi Ruta. Antes el feed tenía su propio criterio (una
    candidata AL AZAR filtrada por inscripciones) y `/path` otro — ahora hay un
    solo motor (`path_engine`, ver `sequencing`) y el feed solo lo presenta."""
    path = path_engine.build_path(db, user.id, upcoming_n=limit, plan=plan)
    in_progress = db.scalar(
        select(LearningUnitAttempt)
        .where(
            LearningUnitAttempt.user_id == user.id,
            LearningUnitAttempt.started_at.isnot(None),
            LearningUnitAttempt.completed_at.is_(None),
        )
        .order_by(LearningUnitAttempt.started_at.desc())
    )
    hero = db.get(LearningUnit, in_progress.unit_id) if in_progress is not None else None

    steps = [s for s in [path.next_step, *path.upcoming] if s is not None]
    if hero is None and steps:
        hero = db.get(LearningUnit, steps[0].unit_id)
    ids = [s.unit_id for s in steps if hero is None or s.unit_id != hero.id]
    by_id = {
        u.id: u for u in db.scalars(select(LearningUnit).where(LearningUnit.id.in_(ids))).all()
    } if ids else {}
    return hero, [by_id[i] for i in ids if i in by_id]


# ─────────────────────────── Endpoints ───────────────────────────


@router.get("/me/onboarding", response_model=OnboardingStatusOut)
def get_onboarding_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> OnboardingStatusOut:
    """Units de la dimensión Onboarding + progreso del user + si sigue
    restringido al resto del catálogo (ver `onboarding.py`)."""
    s = build_onboarding_status(db, current_user)
    return OnboardingStatusOut(
        is_restricted=s.is_restricted,
        units=[
            OnboardingUnitOut(
                unit_id=u.unit_id, slug=u.slug, title=u.title,
                estimated_minutes=u.estimated_minutes, completed=u.completed,
            )
            for u in s.units
        ],
        completed_count=s.completed_count,
        total_count=s.total_count,
        all_completed=s.all_completed,
    )


@router.get("/modulos/feed", response_model=LearningUnitFeed)
def get_feed(
    limit: int = Query(default=20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitFeed:
    plan = build_sequence(db, current_user)
    hero, next_units = _select_feed_units(db, current_user, plan, limit)
    hero_item = _feed_item(db, hero, current_user, plan) if hero else None
    next_items = [_feed_item(db, u, current_user, plan) for u in next_units[:limit]]
    return LearningUnitFeed(hero=hero_item, next=next_items)


@router.get("/modulos/by-dimension", response_model=list[LearningUnitFeedItem])
def list_modulos_by_dimension(
    dimension_code: str = Query(..., pattern=r"^P[1-6]$"),
    level_code: str | None = Query(default=None, pattern=r"^L[1-6]$"),
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LearningUnitFeedItem]:
    """Units publicadas de una dimensión — usado por `/modulos` y `/path`.

    Agrupación por `dimension_code` (la dimensión Drive CP/PR/RE/SA/PI/ES = los 6
    pilares de la app). El frontend pide por career path (P1..P6) y se traduce a
    su(s) dimensión(es) Drive vía `dimensions_for_career_paths`. Hoy solo CP tiene
    contenido → P1 (Carrera) trae las units, P2-P6 quedan vacíos hasta que Jorge
    suba esas dimensiones al Drive.

    Orden por la convención del Drive `Dimensión-Nivel-Pilar-Número`: dentro de la
    dimensión, `level_code` ASC → `pillar_code` ASC → `unit_number` ASC (no por
    orden de import). Excluye units reemplazadas (`superseded_by_unit_id`)."""
    dims = dimensions_for_career_paths([dimension_code])
    conds: list[ColumnElement[bool]] = [
        LearningUnit.dimension_code.in_(dims) if dims else sa_false(),
        LearningUnit.published_at.isnot(None),
        LearningUnit.superseded_by_unit_id.is_(None),
        visible_units_predicate(current_user),  # gating por Área (TASK 8)
    ]
    if level_code:
        conds.append(LearningUnit.level_code == level_code)

    # Orden de convención (nivel → pilar con "AI" al final → número) en Python:
    # un ORDER BY de SQL ordena "AI" antes que "P1" y "P10" antes que "P2".
    units = sorted(db.scalars(select(LearningUnit).where(*conds)).all(), key=unit_sort_key)[:limit]
    plan = build_sequence(db, current_user)
    return [_feed_item(db, u, current_user, plan) for u in units]


@router.get("/modulos/{slug}", response_model=LearningUnitDetail)
def get_unit_detail(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitDetail:
    unit = _published_unit_or_404(db, slug, current_user)
    _ensure_unlocked(db, unit, current_user)
    return _load_unit_detail(db, unit)


@router.post("/modulos/{slug}/attempts/start", response_model=LearningUnitAttemptOut)
def start_attempt(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitAttempt:
    unit = _published_unit_or_404(db, slug, current_user)
    _ensure_unlocked(db, unit, current_user)
    attempt = _get_attempt(db, unit.id, current_user)
    now = datetime.now(UTC)

    if attempt is None:
        attempt = LearningUnitAttempt(
            user_id=current_user.id, unit_id=unit.id, org_id=current_user.org_id, started_at=now
        )
        db.add(attempt)
        db.flush()
    # Si ya existe: idempotente, se devuelve tal cual. En particular, repetir una
    # unit YA completada es un repaso (H3): NO se borra progreso ni se toca
    # completed_at — "completado" nunca retrocede, así los contadores, la racha y
    # el heatmap del manager conservan su historia. El player arranca en limpio
    # del lado del cliente; las respuestas de quiz/reflexión se pisan con la
    # última y los bloques ya completados no mueven su fecha (ver
    # ``_upsert_block_progress``).

    db.refresh(attempt)
    return attempt


@router.get("/modulos/{slug}/attempt", response_model=LearningUnitAttemptOut)
def get_attempt(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> LearningUnitAttempt:
    unit = _published_unit_or_404(db, slug, current_user)
    return _own_attempt_or_404(db, unit, current_user)


def _maybe_complete_unit(
    db: Session, unit: LearningUnit, attempt: LearningUnitAttempt, user: User
) -> None:
    """Unit completa cuando todos los blocks required=true tienen block_progress
    completed. Setea completed_at una sola vez (no pisa completions previas).

    Es el ÚNICO punto de cierre de una unit (lo usan complete, quiz/submit y
    reflection/submit): al pasar a completada recalcula la progresión y los
    badges de su dimensión (Capa Empresa · TASK 6). Antes solo ``complete_block``
    lo hacía, y una unit que terminaba en quiz o reflexión quedaba sin badges."""
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
        db.flush()
        from hg.modules.badges import progression

        progression.recompute_dimension(db, user, unit.dimension_code)


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
    elif progress.status == BlockProgressStatus.completed and status_ == BlockProgressStatus.completed:
        # Ya completado (idempotencia / repaso): conserva la fecha original para no
        # reescribir la historia de actividad (streak, heatmap del equipo).
        pass
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
    unit = _published_unit_or_404(db, slug, current_user)
    unit_block = _unit_block_or_404(db, unit, block_id)
    if unit_block.block_type in (UnitBlockType.quiz_recall, UnitBlockType.reflection_write):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="quiz_recall/reflection_write se completan vía sus propios endpoints /submit",
        )
    attempt = _own_attempt_or_404(db, unit, current_user)
    progress = _upsert_block_progress(db, attempt, unit_block.id, BlockProgressStatus.completed)
    _maybe_complete_unit(db, unit, attempt, current_user)
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
    unit = _published_unit_or_404(db, slug, current_user)
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
    _maybe_complete_unit(db, unit, attempt, current_user)
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
    unit = _published_unit_or_404(db, slug, current_user)
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
    _maybe_complete_unit(db, unit, attempt, current_user)
    db.flush()
    return ReflectionSubmitOut()
