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


# ─────────────────────────── Admin CMS · create/update (TASK A-05) ───────────────────────────

_LEVEL_CODE_RE = r"^L[1-6]$"


class LearningUnitCreate(BaseModel):
    slug: str = Field(pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$", min_length=3, max_length=120)
    title: str = Field(min_length=1, max_length=200)
    pillar_code: str
    competency_code: str | None = None
    level_code: str = Field(pattern=_LEVEL_CODE_RE)
    mentor_id: UUID | None = None
    estimated_duration_seconds: int | None = Field(default=None, ge=0)


class LearningUnitUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    pillar_code: str | None = None
    competency_code: str | None = None
    level_code: str | None = Field(default=None, pattern=_LEVEL_CODE_RE)
    mentor_id: UUID | None = None
    estimated_duration_seconds: int | None = Field(default=None, ge=0)


class QuizOptionCreate(BaseModel):
    text: str = Field(min_length=1)
    is_correct: bool
    explanation: str = Field(min_length=1)


class QuizQuestionSingleChoiceCreate(BaseModel):
    question_type: Literal["single_choice"]
    prompt: str = Field(min_length=1)
    options: list[QuizOptionCreate] = Field(min_length=2)


class QuizQuestionMultipleChoiceCreate(BaseModel):
    question_type: Literal["multiple_choice"]
    prompt: str = Field(min_length=1)
    options: list[QuizOptionCreate] = Field(min_length=2)
    scoring: Literal["all_or_nothing", "partial"] = "partial"


class QuizQuestionTrueFalseCreate(BaseModel):
    question_type: Literal["true_false"]
    prompt: str = Field(min_length=1)
    correct_answer: bool
    explanation_true: str = Field(min_length=1)
    explanation_false: str = Field(min_length=1)


class OrderingItemCreate(BaseModel):
    text: str = Field(min_length=1)
    explanation: str | None = None


class QuizQuestionOrderingCreate(BaseModel):
    question_type: Literal["ordering"]
    prompt: str = Field(min_length=1)
    items: list[OrderingItemCreate] = Field(min_length=2)  # en el orden correcto


class MatchingPairCreate(BaseModel):
    left_text: str = Field(min_length=1)
    right_text: str = Field(min_length=1)
    is_distractor: bool = False


class QuizQuestionMatchingCreate(BaseModel):
    question_type: Literal["matching"]
    prompt: str = Field(min_length=1)
    pairs: list[MatchingPairCreate] = Field(min_length=2)


class FillBlankAnswerCreate(BaseModel):
    correct_text: str = Field(min_length=1)
    accept_variants: list[str] = []
    case_sensitive: bool = False


class QuizQuestionFillBlankCreate(BaseModel):
    question_type: Literal["fill_blank"]
    prompt: str = Field(min_length=1)
    answers: list[FillBlankAnswerCreate] = Field(min_length=1)


QuizQuestionCreateUnion = Annotated[
    QuizQuestionSingleChoiceCreate
    | QuizQuestionMultipleChoiceCreate
    | QuizQuestionTrueFalseCreate
    | QuizQuestionOrderingCreate
    | QuizQuestionMatchingCreate
    | QuizQuestionFillBlankCreate,
    Field(discriminator="question_type"),
]


class VideoBlockCreate(BaseModel):
    block_type: Literal["video_intro", "video_teaching", "video_closing"]
    position: int
    required: bool = True
    youtube_video_id: str = Field(min_length=1)  # validado/parseado en A-06
    poster_url: str | None = None
    duration_seconds: int = Field(gt=0)
    subtitle_url: str | None = None
    transcript_text: str | None = None
    eyebrow_label: str | None = None


class TextBlockCreate(BaseModel):
    block_type: Literal["text_context", "text_evidence", "text_solution"]
    position: int
    required: bool = True
    variant: Literal["context", "evidence", "solution"]
    eyebrow: str = Field(min_length=1)
    body: str = Field(min_length=1)
    citation: CitationOut | None = None
    applies_to: list[str] | None = None
    requires_evidence_block_id: UUID | None = None


class QuizBlockCreate(BaseModel):
    block_type: Literal["quiz_recall"] = "quiz_recall"
    position: int
    required: bool = True
    eyebrow: str = "COMPROBÁ TU COMPRENSIÓN"
    questions: list[QuizQuestionCreateUnion] = Field(min_length=1)


class ReflectionBlockCreate(BaseModel):
    block_type: Literal["reflection_write"] = "reflection_write"
    position: int
    required: bool = True
    eyebrow: str = "APLICALO ESTA SEMANA"
    prompt: str = Field(min_length=1)
    min_chars: int = Field(default=30, ge=1)
    max_chars: int = Field(default=500, ge=1)
    example: str | None = None


BlockCreate = Annotated[
    VideoBlockCreate | TextBlockCreate | QuizBlockCreate | ReflectionBlockCreate,
    Field(discriminator="block_type"),
]


class BlockReorderRequest(BaseModel):
    block_ids: list[UUID] = Field(min_length=1)


class PublishValidationError(BaseModel):
    errors: list[str]
