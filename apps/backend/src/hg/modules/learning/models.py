"""Learning models — catálogo PMM v3 (events) + perfiles de aprendizaje.

Schema productivo. El catálogo es **global al producto** (no multi-tenant):
los events son contenido HG, no por organización. Por eso `CareerPath` y
`Event` no llevan `org_id` ni RLS. `Enrollment`, `CourseProgress` y
`UserLearningProfile` SÍ son por usuario/org y se mantienen draft hasta B2-08.

``Event`` reemplaza a ``Course`` (rename real de tabla en LU-01, TASK A-07 —
ver docs/prompts/claude-code_learning_units_v2_fase1.md). ``CourseProgress``
queda como está a propósito (nombre de clase + columna ``course_id``): el
rename de esa tabla/columna es explícitamente Fase 2, documentado en la
migración LU-01. Su FK apunta a ``events.id`` (la tabla renombrada), solo el
nombre de columna/clase sigue diciendo "course".
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


class EventTrack(str, enum.Enum):
    competency = "competency"  # Event típico (C1..C5 x L1..L6)
    foundation_ai = "foundation_ai"  # FND - AI literacy
    foundation_eth = "foundation_eth"  # FND - Ethics
    foundation_specifics = "foundation_specifics"  # FND - Specifics


class EventType(str, enum.Enum):
    live_webinar = "live_webinar"
    recorded_webinar = "recorded_webinar"
    masterclass_live = "masterclass_live"
    masterclass_replay = "masterclass_replay"


class CareerPath(Base):
    """One of the 6 growth pillars (P1-P6)."""

    __tablename__ = "career_paths"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(10), unique=True, nullable=False)  # e.g. "P1"
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    events: Mapped[list[Event]] = relationship("Event", back_populates="career_path", lazy="raise")
    enrollments: Mapped[list[Enrollment]] = relationship(
        "Enrollment", back_populates="career_path", lazy="raise"
    )


class Event(Base):
    """Un evento del catálogo: replay grabado (legacy "curso") o webinar live.

    Renombrado de ``Course`` (LU-01, TASK A-07) — mismo schema PMM v3 más
    ``event_type``/``is_preview``/``presenter_id``/``scheduled_at`` sumados
    en esa misma migración. ``is_preview=True`` marca los events migrados
    desde ``courses`` como preview temporal (decisión 9.5 de la propuesta
    v2.1) — se limpian cuando haya volumen de Learning Units real.
    """

    __tablename__ = "events"

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
    track: Mapped[EventTrack] = mapped_column(
        Enum(EventTrack, name="course_track"),
        nullable=False,
        default=EventTrack.competency,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    # Sumados en LU-01 (TASK A-01/A-07) para el rebrand courses→events.
    event_type: Mapped[EventType] = mapped_column(
        Enum(EventType, name="event_type"), nullable=False, default=EventType.recorded_webinar
    )
    is_preview: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    presenter_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    career_path: Mapped[CareerPath] = relationship("CareerPath", back_populates="events", lazy="raise")
    progress_records: Mapped[list[CourseProgress]] = relationship(
        "CourseProgress", back_populates="course", lazy="raise"
    )


class Enrollment(Base):
    """Usuario inscrito (o asignado) a un CareerPath.

    Permite múltiples enrollments activos por usuario (un usuario puede estar
    siguiendo P1 y P2 simultáneamente). Asignación manual por manager / admin /
    superadmin. Cuando llegue B2-05 (recomendación automática), se inserta
    también con ``assigned_by_user_id=NULL`` y ``source='auto'``. RLS por org.
    """

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
        UUID(as_uuid=True), ForeignKey("career_paths.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")  # manual | auto
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, index=True)
    enrolled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    career_path: Mapped[CareerPath] = relationship(
        "CareerPath", back_populates="enrollments", lazy="raise"
    )


class CourseProgress(Base):
    """Progreso de visualización de un usuario en un curso.

    Un row por (user_id, course_id). Se inserta al primer play y se actualiza
    en cada heartbeat. ``is_completed=True`` cuando ``watch_pct >= 80`` (umbral
    fijo del MVP — revisable cuando los coaches firmen criterios pedagógicos).
    Por usuario x org → RLS estándar (tenant_isolation).
    """

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
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    last_position_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    watch_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    is_completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    first_played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    last_played_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    course: Mapped[Event] = relationship("Event", back_populates="progress_records", lazy="raise")


class UserLearningProfile(Base):
    """Snapshot agregado por user del estado actual de los pilares (read-optimized).

    Productivo (B2-02). ``pillar_states`` es un resumen del último ``PillarResult``
    por pilar; la fuente de verdad histórica vive en ``pillar_results``."""

    __tablename__ = "user_learning_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # Ejemplo:
    # {
    #   "P1": {"state": "L3", "source": "preliminary", "sub_scores": {...}, "derived_at": "..."},
    #   "P2": {"state": "Direccionado", "source": "confirmed", "sub_scores": {...}, ...},
    #   ...
    # }
    pillar_states: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    onboarding_short_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_assessment_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
