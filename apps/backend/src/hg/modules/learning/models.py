"""Learning models: CareerPath, Course, Enrollment, CourseProgress, UserLearningProfile.

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

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from hg.db import Base


class CareerPath(Base):
    """One of the 6 growth pillars (P1-P6)."""

    __tablename__ = "career_paths"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # e.g. "P1"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    courses: Mapped[list[Course]] = relationship("Course", back_populates="career_path", lazy="raise")
    enrollments: Mapped[list[Enrollment]] = relationship(
        "Enrollment", back_populates="career_path", lazy="raise"
    )


class Course(Base):
    """A single micro-learning video unit within a career path."""

    __tablename__ = "courses"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    career_path_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    video_url: Mapped[str] = mapped_column(String(2048), nullable=False)  # Cloudflare R2 HLS
    thumbnail_url: Mapped[str | None] = mapped_column(String(2048))
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    career_path: Mapped[CareerPath] = relationship("CareerPath", back_populates="courses", lazy="raise")
    progress_records: Mapped[list[CourseProgress]] = relationship(
        "CourseProgress", back_populates="course", lazy="raise"
    )


class Enrollment(Base):
    """User enrolled (or assigned) to a career path."""

    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "career_path_id", name="uq_enrollment_user_path"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    career_path_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), nullable=False
    )
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    career_path: Mapped[CareerPath] = relationship(
        "CareerPath", back_populates="enrollments", lazy="raise"
    )


class CourseProgress(Base):
    """Per-user video watch progress. Updated asynchronously via Celery."""

    __tablename__ = "course_progress"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_progress_user_course"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False
    )
    watch_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    last_position_sec: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # Marked completed when watch_pct >= 0.80
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    course: Mapped[Course] = relationship("Course", back_populates="progress_records", lazy="raise")


class UserLearningProfile(Base):
    """Aggregated learning state for a user: pillar scores + current path."""

    __tablename__ = "user_learning_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # e.g. {"P1": 0.85, "P2": 0.60, "P3": 0.0, "P4": 0.0, "P5": 0.0, "P6": 0.0}
    pillar_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    current_path_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="SET NULL")
    )
    onboarding_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
