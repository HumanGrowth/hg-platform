"""Pydantic v2 schemas — Learning Units v2 (Fase 1).

Dos familias de discriminated unions (``Field(discriminator=...)``):

- ``BlockUnion`` por ``block_type`` (4 sub-vistas: video/text/quiz/reflection)
- ``QuizQuestionUnion`` por ``question_type`` (6 tipos)
- ``QuizSubmitPayload`` también discrimina por ``question_type`` en el submit
  (cada tipo espera una forma de respuesta distinta — no tiene sentido un
  payload plano con todos los campos opcionales).
"""
from __future__ import annotations

from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ─────────────────────────── Bloques · read ───────────────────────────


class BlockRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    required: bool
    block_type: str


class VideoBlockRead(BlockRead):
    block_type: Literal["video_intro", "video_teaching", "video_closing"]
    youtube_video_id: str
    poster_url: str | None
    duration_seconds: int
    subtitle_url: str | None
    transcript_text: str | None
    eyebrow_label: str | None


class CitationOut(BaseModel):
    text: str
    source: str
    year: int
    doi_or_url: str
    tier: Literal["meta_analysis", "rct", "observational", "expert_opinion"]


class TextBlockRead(BlockRead):
    block_type: Literal["text_context", "text_evidence", "text_solution"]
    variant: Literal["context", "evidence", "solution"]
    eyebrow: str
    body: str
    citation: CitationOut | None
    applies_to: list[str] | None
    requires_evidence_block_id: UUID | None


# ─────────────────────────── Quiz · 6 tipos ───────────────────────────


class QuizOptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    text: str


class QuizQuestionBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    position: int
    prompt: str


class QuizQuestionSingleChoice(QuizQuestionBase):
    question_type: Literal["single_choice"]
    options: list[QuizOptionOut]


class QuizQuestionMultipleChoice(QuizQuestionBase):
    question_type: Literal["multiple_choice"]
    options: list[QuizOptionOut]
    scoring: Literal["all_or_nothing", "partial"]


class QuizQuestionTrueFalse(QuizQuestionBase):
    question_type: Literal["true_false"]
    # correct_answer NO se expone acá — solo en el feedback post-submit.


class OrderingItemOut(BaseModel):
    id: UUID
    text: str


class QuizQuestionOrdering(QuizQuestionBase):
    question_type: Literal["ordering"]
    items: list[OrderingItemOut]  # shuffled por el router, sin correct_position


class MatchingItemOut(BaseModel):
    id: str
    text: str


class QuizQuestionMatching(QuizQuestionBase):
    question_type: Literal["matching"]
    left_items: list[MatchingItemOut]
    right_items: list[MatchingItemOut]


class QuizQuestionFillBlank(QuizQuestionBase):
    question_type: Literal["fill_blank"]
    blanks_count: int


QuizQuestionUnion = Annotated[
    QuizQuestionSingleChoice
    | QuizQuestionMultipleChoice
    | QuizQuestionTrueFalse
    | QuizQuestionOrdering
    | QuizQuestionMatching
    | QuizQuestionFillBlank,
    Field(discriminator="question_type"),
]


class QuizBlockRead(BlockRead):
    block_type: Literal["quiz_recall"]
    eyebrow: str
    questions: list[QuizQuestionUnion]


class ReflectionBlockRead(BlockRead):
    block_type: Literal["reflection_write"]
    eyebrow: str
    prompt: str
    min_chars: int
    max_chars: int
    example: str | None


BlockUnion = Annotated[
    VideoBlockRead | TextBlockRead | QuizBlockRead | ReflectionBlockRead,
    Field(discriminator="block_type"),
]


# ─────────────────────────── Unit · read ───────────────────────────


class LearningUnitDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    slug: str
    title: str
    pillar_code: str
    competency_code: str | None
    level_code: str
    mentor_id: UUID | None
    published_at: datetime | None
    estimated_duration_seconds: int | None
    blocks: list[BlockUnion]


class LearningUnitFeedItem(BaseModel):
    id: UUID
    slug: str
    title: str
    pillar_code: str
    level_code: str
    estimated_duration_seconds: int | None
    blocks_count: int
    attempt_status: Literal["not_started", "in_progress", "completed"]
    poster_url: str | None


class LearningUnitFeed(BaseModel):
    hero: LearningUnitFeedItem | None
    next: list[LearningUnitFeedItem]


# ─────────────────────────── Attempts + progress ───────────────────────────


class BlockProgressOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    unit_block_id: UUID
    status: Literal["started", "completed"]
    submitted_at: datetime | None


class LearningUnitAttemptOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    unit_id: UUID
    started_at: datetime | None
    completed_at: datetime | None
    block_progress: list[BlockProgressOut] = []


# ─────────────────────────── Quiz submit ───────────────────────────


class QuizSubmitSingleChoice(BaseModel):
    question_id: UUID
    question_type: Literal["single_choice"]
    selected_option_ids: list[UUID] = Field(min_length=1)


class QuizSubmitMultipleChoice(BaseModel):
    question_id: UUID
    question_type: Literal["multiple_choice"]
    selected_option_ids: list[UUID]


class QuizSubmitTrueFalse(BaseModel):
    question_id: UUID
    question_type: Literal["true_false"]
    boolean_answer: bool


class QuizSubmitOrdering(BaseModel):
    question_id: UUID
    question_type: Literal["ordering"]
    ordering: list[UUID] = Field(min_length=1)


class QuizSubmitMatching(BaseModel):
    question_id: UUID
    question_type: Literal["matching"]
    matching: list[tuple[UUID, UUID]]


class QuizSubmitFillBlank(BaseModel):
    question_id: UUID
    question_type: Literal["fill_blank"]
    fill_blank_answers: list[str] = Field(min_length=1)


QuizSubmitPayload = Annotated[
    QuizSubmitSingleChoice
    | QuizSubmitMultipleChoice
    | QuizSubmitTrueFalse
    | QuizSubmitOrdering
    | QuizSubmitMatching
    | QuizSubmitFillBlank,
    Field(discriminator="question_type"),
]


class QuizSubmitResult(BaseModel):
    question_id: UUID
    is_correct: bool
    explanation: str | None
    correct_answer: dict | None


class QuizSubmitRequest(BaseModel):
    responses: list[QuizSubmitPayload]


class QuizSubmitResponse(BaseModel):
    results: list[QuizSubmitResult]
    block_completed: bool


# ─────────────────────────── Reflection submit ───────────────────────────


class ReflectionSubmitIn(BaseModel):
    text: str = Field(min_length=1, max_length=5000)


class ReflectionSubmitOut(BaseModel):
    ok: bool = True
