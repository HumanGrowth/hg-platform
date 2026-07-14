"""Learning Units v2 — contenido modular por bloques (Fase 1).

Dos familias de tablas:

- **Contenido** (``learning_units`` + templates de bloque + quiz): catálogo
  global HG, sin ``org_id`` ni RLS — mismo patrón que ``career_paths`` /
  ``courses`` (ver ``hg.modules.learning.models``).
- **Progreso** (``learning_unit_attempts`` + hijas): privado por user x org.
  Solo ``LearningUnitAttempt`` lleva RLS (``tenant_isolation`` por
  ``org_id``); ``BlockProgress`` / ``QuizResponse`` / ``ReflectionText``
  cuelgan de ``attempt_id`` sin RLS propio — el aislamiento lo impone el
  router verificando ``attempt.user_id == current_user.id`` (ver
  ``hg.modules.learning_units.router``).

``UnitBlock.block_id`` es un FK **polimórfico** (sin constraint de DB — no
existe una única tabla de destino): el ``block_type`` indica a qué tabla de
template resolver. La resolución vive en la capa de schemas/router, no en
SQLAlchemy (ver ``BLOCK_TYPE_TO_MODEL`` al final de este archivo).
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from hg.db import Base
from hg.modules.learning.models import CompetencyCode


class UnitBlockType(str, enum.Enum):
    video_intro = "video_intro"
    video_teaching = "video_teaching"
    video_closing = "video_closing"
    text_context = "text_context"
    text_evidence = "text_evidence"
    text_solution = "text_solution"
    quiz_recall = "quiz_recall"
    reflection_write = "reflection_write"


class TextBlockVariant(str, enum.Enum):
    context = "context"
    evidence = "evidence"
    solution = "solution"


class QuizQuestionType(str, enum.Enum):
    single_choice = "single_choice"
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    ordering = "ordering"
    matching = "matching"
    fill_blank = "fill_blank"


class QuizScoringMode(str, enum.Enum):
    all_or_nothing = "all_or_nothing"
    partial = "partial"


class BlockProgressStatus(str, enum.Enum):
    started = "started"
    completed = "completed"


class LearningUnit(Base):
    """Cabecera de un módulo de aprendizaje: meta + secuencia ordenada de bloques."""

    __tablename__ = "learning_units"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    pillar_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("career_paths.code"), nullable=False, index=True
    )
    competency_code: Mapped[CompetencyCode | None] = mapped_column(
        Enum(CompetencyCode, name="competency_code", create_type=False), nullable=True
    )
    level_code: Mapped[str] = mapped_column(String(10), nullable=False)  # L1..L6
    mentor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    superseded_by_unit_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_units.id", ondelete="SET NULL")
    )
    estimated_duration_seconds: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    blocks: Mapped[list[UnitBlock]] = relationship(
        "UnitBlock", back_populates="unit", order_by="UnitBlock.position", cascade="all, delete-orphan"
    )


class UnitBlock(Base):
    """Índice ordenado de bloques de una unit. ``block_id`` es polimórfico (sin FK)."""

    __tablename__ = "unit_blocks"
    __table_args__ = (UniqueConstraint("unit_id", "position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    block_type: Mapped[UnitBlockType] = mapped_column(
        Enum(UnitBlockType, name="unit_block_type", create_type=False), nullable=False
    )
    block_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    required: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    unit: Mapped[LearningUnit] = relationship("LearningUnit", back_populates="blocks")


class VideoBlock(Base):
    """Template ``video_intro`` / ``video_teaching`` / ``video_closing``.

    ``video_url`` apunta a un MP4 servido desde R2 (mismo pattern que
    ``events``/``event_streams``) — YouTube embed salió de scope
    (lu-refine-A-01/A-02): un ``<video src>` nativo no depende de un host
    externo ni de su iframe/JSAPI.
    """

    __tablename__ = "video_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    video_url: Mapped[str] = mapped_column(Text, nullable=False)
    poster_url: Mapped[str | None] = mapped_column(String(2048))
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    subtitle_url: Mapped[str | None] = mapped_column(String(2048))
    transcript_text: Mapped[str | None] = mapped_column(Text)
    eyebrow_label: Mapped[str | None] = mapped_column(String(60))


class TextBlock(Base):
    """Template ``text_context`` / ``text_evidence`` / ``text_solution``.

    ``citation`` (JSONB) solo aplica a ``variant=evidence``. ``applies_to`` y
    ``requires_evidence_block_id`` solo a ``variant=solution``.
    """

    __tablename__ = "text_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    variant: Mapped[TextBlockVariant] = mapped_column(
        Enum(TextBlockVariant, name="text_block_variant", create_type=False), nullable=False
    )
    eyebrow: Mapped[str] = mapped_column(String(60), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    citation: Mapped[dict | None] = mapped_column(JSONB)
    applies_to: Mapped[list[str] | None] = mapped_column(ARRAY(String(10)))
    requires_evidence_block_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("text_blocks.id", ondelete="SET NULL")
    )


class QuizBlock(Base):
    """Template ``quiz_recall`` — contenedor de 1..N ``QuizQuestion``."""

    __tablename__ = "quiz_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    eyebrow: Mapped[str] = mapped_column(String(60), nullable=False, default="COMPROBÁ TU COMPRENSIÓN")

    questions: Mapped[list[QuizQuestion]] = relationship(
        "QuizQuestion", back_populates="quiz_block", order_by="QuizQuestion.position",
        cascade="all, delete-orphan",
    )


class QuizQuestion(Base):
    """Una pregunta dentro de un ``quiz_recall``. Polimórfica por ``question_type``
    (6 tipos) — cada tipo apunta a su propia tabla hija."""

    __tablename__ = "quiz_questions"
    __table_args__ = (UniqueConstraint("quiz_block_id", "position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    quiz_block_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_blocks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[QuizQuestionType] = mapped_column(
        Enum(QuizQuestionType, name="quiz_question_type", create_type=False), nullable=False
    )
    prompt: Mapped[str] = mapped_column(Text, nullable=False)

    quiz_block: Mapped[QuizBlock] = relationship("QuizBlock", back_populates="questions")
    options: Mapped[list[QuizOption]] = relationship(
        "QuizOption", back_populates="question", order_by="QuizOption.position",
        cascade="all, delete-orphan",
    )
    true_false: Mapped[QuizTrueFalse | None] = relationship(
        "QuizTrueFalse", back_populates="question", cascade="all, delete-orphan", uselist=False
    )
    ordering_items: Mapped[list[QuizOrderingItem]] = relationship(
        "QuizOrderingItem", back_populates="question", order_by="QuizOrderingItem.correct_position",
        cascade="all, delete-orphan",
    )
    matching_pairs: Mapped[list[QuizMatchingPair]] = relationship(
        "QuizMatchingPair", back_populates="question", cascade="all, delete-orphan"
    )
    fill_blank_answers: Mapped[list[QuizFillBlankAnswer]] = relationship(
        "QuizFillBlankAnswer", back_populates="question", order_by="QuizFillBlankAnswer.position",
        cascade="all, delete-orphan",
    )
    multiple_choice_config: Mapped[QuizMultipleChoiceConfig | None] = relationship(
        "QuizMultipleChoiceConfig", back_populates="question", cascade="all, delete-orphan", uselist=False
    )


class QuizOption(Base):
    """Opción de una pregunta ``single_choice`` o ``multiple_choice``."""

    __tablename__ = "quiz_options"
    __table_args__ = (UniqueConstraint("question_id", "position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="options")


class QuizTrueFalse(Base):
    """Extensión 1:1 para preguntas ``true_false``."""

    __tablename__ = "quiz_true_false"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), primary_key=True
    )
    correct_answer: Mapped[bool] = mapped_column(Boolean, nullable=False)
    explanation_true: Mapped[str] = mapped_column(Text, nullable=False)
    explanation_false: Mapped[str] = mapped_column(Text, nullable=False)

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="true_false")


class QuizOrderingItem(Base):
    """Item reordenable de una pregunta ``ordering``."""

    __tablename__ = "quiz_ordering_items"
    __table_args__ = (UniqueConstraint("question_id", "correct_position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    correct_position: Mapped[int] = mapped_column(Integer, nullable=False)
    explanation: Mapped[str | None] = mapped_column(Text)

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="ordering_items")


class QuizMatchingPair(Base):
    """Par izquierda↔derecha de una pregunta ``matching``. ``is_distractor`` fuerza
    discriminación (item sin pareja correcta)."""

    __tablename__ = "quiz_matching_pairs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    left_text: Mapped[str] = mapped_column(Text, nullable=False)
    right_text: Mapped[str] = mapped_column(Text, nullable=False)
    is_distractor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="matching_pairs")


class QuizFillBlankAnswer(Base):
    """Respuesta correcta (+ variantes aceptadas) de un blank en ``fill_blank``."""

    __tablename__ = "quiz_fill_blank_answers"
    __table_args__ = (UniqueConstraint("question_id", "position"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    correct_text: Mapped[str] = mapped_column(Text, nullable=False)
    accept_variants: Mapped[list[str]] = mapped_column(ARRAY(Text), default=list, nullable=False)
    case_sensitive: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="fill_blank_answers")


class QuizMultipleChoiceConfig(Base):
    """Extensión 1:1 para preguntas ``multiple_choice`` — modo de scoring."""

    __tablename__ = "quiz_multiple_choice_config"

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), primary_key=True
    )
    scoring: Mapped[QuizScoringMode] = mapped_column(
        Enum(QuizScoringMode, name="quiz_scoring_mode", create_type=False),
        nullable=False, default=QuizScoringMode.partial,
    )

    question: Mapped[QuizQuestion] = relationship("QuizQuestion", back_populates="multiple_choice_config")


class ReflectionBlock(Base):
    """Template ``reflection_write``."""

    __tablename__ = "reflection_blocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    eyebrow: Mapped[str] = mapped_column(String(60), nullable=False, default="APLICALO ESTA SEMANA")
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    min_chars: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    max_chars: Mapped[int] = mapped_column(Integer, nullable=False, default=500)
    example: Mapped[str | None] = mapped_column(Text)


class LearningUnitAttempt(Base):
    """Intento de un user sobre una unit. Único por ``(user_id, unit_id)`` —
    los replays reusan la misma row (ver reglas de completion en el router).
    RLS por ``org_id`` (única tabla de Learning Units con RLS)."""

    __tablename__ = "learning_unit_attempts"
    __table_args__ = (UniqueConstraint("user_id", "unit_id", name="uq_attempt_user_unit"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    block_progress: Mapped[list[BlockProgress]] = relationship(
        "BlockProgress", back_populates="attempt", cascade="all, delete-orphan"
    )
    quiz_responses: Mapped[list[QuizResponse]] = relationship(
        "QuizResponse", back_populates="attempt", cascade="all, delete-orphan"
    )
    reflection_texts: Mapped[list[ReflectionText]] = relationship(
        "ReflectionText", back_populates="attempt", cascade="all, delete-orphan"
    )


class BlockProgress(Base):
    """Progreso de un user en un bloque puntual de su attempt actual."""

    __tablename__ = "block_progress"
    __table_args__ = (UniqueConstraint("attempt_id", "unit_block_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_unit_attempts.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    unit_block_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("unit_blocks.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[BlockProgressStatus] = mapped_column(
        Enum(BlockProgressStatus, name="block_progress_status", create_type=False), nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    attempt: Mapped[LearningUnitAttempt] = relationship("LearningUnitAttempt", back_populates="block_progress")


class QuizResponse(Base):
    """Respuesta enviada a una ``QuizQuestion``. ``response_data`` guarda el
    payload crudo (forma depende de ``question_type`` — ver
    ``hg.modules.learning_units.schemas.QuizSubmitPayload``)."""

    __tablename__ = "quiz_responses"
    __table_args__ = (UniqueConstraint("attempt_id", "question_id"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_unit_attempts.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("quiz_questions.id", ondelete="CASCADE"), nullable=False
    )
    is_correct: Mapped[bool] = mapped_column(Boolean, nullable=False)
    response_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    responded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attempt: Mapped[LearningUnitAttempt] = relationship("LearningUnitAttempt", back_populates="quiz_responses")


class ReflectionText(Base):
    """Texto de reflexión enviado. Privado — solo visible al user y agregados
    anónimos para manager/RRHH (Fase 6)."""

    __tablename__ = "reflection_texts"
    __table_args__ = (
        UniqueConstraint("attempt_id", "reflection_block_id"),
        CheckConstraint("char_length(text) BETWEEN 30 AND 500", name="ck_reflection_texts_length"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_unit_attempts.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    reflection_block_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("reflection_blocks.id", ondelete="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    attempt: Mapped[LearningUnitAttempt] = relationship(
        "LearningUnitAttempt", back_populates="reflection_texts"
    )


# Resolución del FK polimórfico de UnitBlock.block_id → tabla de template.
BLOCK_TYPE_TO_MODEL: dict[UnitBlockType, type] = {
    UnitBlockType.video_intro: VideoBlock,
    UnitBlockType.video_teaching: VideoBlock,
    UnitBlockType.video_closing: VideoBlock,
    UnitBlockType.text_context: TextBlock,
    UnitBlockType.text_evidence: TextBlock,
    UnitBlockType.text_solution: TextBlock,
    UnitBlockType.quiz_recall: QuizBlock,
    UnitBlockType.reflection_write: ReflectionBlock,
}
