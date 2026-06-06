"""People / Assessment models: questions, options, attempts, and answers.

⚠️ DRAFT — generado adelantando trabajo. Depende de:
  - DEC-01 (algoritmo de scoring)
  - DEC-02 (reglas de recomendación de path)
  - DEC-05 (contenido de escenarios situacionales)
  - DEC-07 (criterio de pilar completado)

Revisar y firmar contra el doc final de decisiones antes de generar la
migración productiva. Hoy se incluyen en metadata para que Alembic los
detecte, pero NO deberían ejecutarse cambios destructivos hasta validar.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from hg.db import Base


class AssessmentType(str, enum.Enum):
    onboarding = "onboarding"
    pillar = "pillar"


class AssessmentQuestion(Base):
    """Situational scenario question used in onboarding or pillar assessments."""

    __tablename__ = "assessment_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # NULL means onboarding assessment; otherwise scoped to a specific pillar
    career_path_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), index=True
    )
    assessment_type: Mapped[AssessmentType] = mapped_column(
        Enum(AssessmentType, name="assessment_type"), nullable=False
    )
    body: Mapped[str] = mapped_column(String(2000), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    options: Mapped[list[AssessmentOption]] = relationship(
        "AssessmentOption", back_populates="question", lazy="raise", cascade="all, delete-orphan"
    )


class AssessmentOption(Base):
    """One answer choice for an assessment question with its scoring weight."""

    __tablename__ = "assessment_options"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    body: Mapped[str] = mapped_column(String(1000), nullable=False)
    score_value: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)

    question: Mapped[AssessmentQuestion] = relationship(
        "AssessmentQuestion", back_populates="options", lazy="raise"
    )


class AssessmentAttempt(Base):
    """A single assessment session taken by a user (re-takes allowed)."""

    __tablename__ = "assessment_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assessment_type: Mapped[AssessmentType] = mapped_column(
        Enum(AssessmentType, name="assessment_type"), nullable=False
    )
    # NULL for onboarding attempts
    career_path_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    # Pillar assessments pass at >= 0.70
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    answers: Mapped[list[AssessmentAnswer]] = relationship(
        "AssessmentAnswer", back_populates="attempt", lazy="raise", cascade="all, delete-orphan"
    )


class AssessmentAnswer(Base):
    """Selected option for one question within an attempt."""

    __tablename__ = "assessment_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    attempt_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_attempts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False
    )
    selected_option_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_options.id", ondelete="CASCADE"), nullable=False
    )

    attempt: Mapped[AssessmentAttempt] = relationship(
        "AssessmentAttempt", back_populates="answers", lazy="raise"
    )
