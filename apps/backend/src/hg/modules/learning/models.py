"""Learning models — catálogo de cursos PMM v3 + perfiles de aprendizaje.

Schema productivo. El catálogo es **global al producto** (no multi-tenant):
los cursos son contenido HG, no por organización. Por eso `CareerPath` y
`Course` no llevan `org_id` ni RLS. `Enrollment`, `CourseProgress` y
`UserLearningProfile` SÍ son por usuario/org y se mantienen draft hasta B2-08.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
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


class CareerLevel(str, enum.Enum):
    L1 = "L1"  # Foundation (Junior)
    L2 = "L2"  # Developing (Coordinator/Analyst)
    L3 = "L3"  # Applying (Senior)
    L4 = "L4"  # Enabling (Lead/Supervisor)
    L5 = "L5"  # Advising (Manager/Sr.Manager)
    L6 = "L6"  # Directing (Director)


class CompetencyCode(str, enum.Enum):
    C1 = "C1"  # Adaptabilidad y Aprendizaje
    C2 = "C2"  # Excelencia Operativa y Colaboración
    C3 = "C3"  # Expertise y Pensamiento Estratégico
    C4 = "C4"  # Comunicación e Influencia
    C5 = "C5"  # Inteligencia Emocional y Social


class CourseTrack(str, enum.Enum):
    competency = "competency"  # Course típico (C1..C5 x L1..L6)
    foundation_ai = "foundation_ai"  # FND - AI literacy
    foundation_eth = "foundation_eth"  # FND - Ethics
    foundation_specifics = "foundation_specifics"  # FND - Specifics


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
    slug: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    # video_url nullable hasta migrar el MP4 original; el player usa hls_master_url.
    video_url: Mapped[str | None] = mapped_column(String(2048))
    hls_master_url: Mapped[str | None] = mapped_column(String(2048))  # .m3u8
    thumbnail_url: Mapped[str | None] = mapped_column(String(2048))
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Sub-clasificación PMM v3 (todo el catálogo vive bajo P1 Carrera por ahora).
    career_level: Mapped[CareerLevel] = mapped_column(
        Enum(CareerLevel, name="career_level_pmm"), nullable=False, index=True
    )
    competency_code: Mapped[CompetencyCode | None] = mapped_column(
        Enum(CompetencyCode, name="competency_code"), nullable=True, index=True
    )
    track: Mapped[CourseTrack] = mapped_column(
        Enum(CourseTrack, name="course_track"),
        nullable=False,
        default=CourseTrack.competency,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    career_path: Mapped[CareerPath] = relationship("CareerPath", back_populates="courses", lazy="raise")
    progress_records: Mapped[list[CourseProgress]] = relationship(
        "CourseProgress", back_populates="course", lazy="raise"
    )


class Enrollment(Base):
    """# ⚠️ DRAFT — depende de B2-08. User enrolled (or assigned) to a career path.

    En metadata pero NO la crea la migración B2-01; se materializa en B2-08."""

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
    """# ⚠️ DRAFT — depende de B2-08. Per-user video watch progress (Celery).

    En metadata pero NO la crea la migración B2-01; se materializa en B2-08."""

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
    """# ⚠️ DRAFT — depende de B2-08. Aggregated learning state per user.

    En metadata pero NO la crea la migración B2-01; se materializa en B2-08."""

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
