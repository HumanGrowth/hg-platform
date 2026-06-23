"""Modelos del motor de assessment (B2-02).

- Catálogo global (sin RLS): ``AssessmentInstrument``, ``AssessmentItem``,
  ``AssessmentItemOption``.
- Por usuario (RLS): ``AssessmentSession``, ``AssessmentResponse``, ``PillarResult``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base
from hg.modules.assessment.enums import (
    InstrumentCode,
    PillarCode,
    ResponseType,
    ResultSource,
    SessionKind,
    SessionStatus,
)


class AssessmentInstrument(Base):
    """Catálogo de los 9 instrumentos psicométricos. Global (sin RLS)."""

    __tablename__ = "assessment_instruments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[InstrumentCode] = mapped_column(
        Enum(InstrumentCode, name="instrument_code"), unique=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    pillar_code: Mapped[PillarCode] = mapped_column(
        Enum(PillarCode, name="pillar_code"), nullable=False
    )
    description: Mapped[str | None] = mapped_column(String(2000))
    author: Mapped[str | None] = mapped_column(String(120))
    validation_notes: Mapped[str | None] = mapped_column(String(2000))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class AssessmentItem(Base):
    """Items del assessment. Catálogo global (sin RLS)."""

    __tablename__ = "assessment_items"
    __table_args__ = (UniqueConstraint("item_code", name="uq_assessment_item_code"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    instrument_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_instruments.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    pillar_code: Mapped[PillarCode] = mapped_column(
        Enum(PillarCode, name="pillar_code"), nullable=False, index=True
    )
    item_code: Mapped[str] = mapped_column(String(20), nullable=False)
    sub_scale: Mapped[str | None] = mapped_column(String(40))
    sub_domain: Mapped[str | None] = mapped_column(String(40))
    response_type: Mapped[ResponseType] = mapped_column(
        Enum(ResponseType, name="response_type_enum"), nullable=False
    )
    scale_min: Mapped[int | None] = mapped_column(Integer)
    scale_max: Mapped[int | None] = mapped_column(Integer)
    reverse_scored: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    short_subset: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    prompt: Mapped[str] = mapped_column(String(500), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class AssessmentItemOption(Base):
    """Opciones para items multiple-choice (Prochaska, PMM, CFPB B1/B5). Global."""

    __tablename__ = "assessment_item_options"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False)
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    value: Mapped[int] = mapped_column(Integer, nullable=False)
    state_mapped: Mapped[str | None] = mapped_column(String(40))


class AssessmentSession(Base):
    """Sesión de assessment. Por user. RLS."""

    __tablename__ = "assessment_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    kind: Mapped[SessionKind] = mapped_column(
        Enum(SessionKind, name="session_kind"), nullable=False
    )
    target_pillar: Mapped[PillarCode | None] = mapped_column(
        Enum(PillarCode, name="pillar_code"), index=True
    )
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status"),
        nullable=False,
        default=SessionStatus.in_progress,
        index=True,
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AssessmentResponse(Base):
    """Respuesta a un item de una sesión. RLS."""

    __tablename__ = "assessment_responses"
    __table_args__ = (
        UniqueConstraint("session_id", "item_id", name="uq_response_session_item"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("assessment_items.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    response_value: Mapped[int] = mapped_column(Integer, nullable=False)
    qualitative_text: Mapped[str | None] = mapped_column(String(4000))
    response_time_ms: Mapped[int | None] = mapped_column(Integer)
    presentation_mode: Mapped[str] = mapped_column(String(20), nullable=False, default="traditional")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PillarResult(Base):
    """Resultado por pilar para un user. Histórico (no se sobreescribe). RLS."""

    __tablename__ = "pillar_results"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    pillar_code: Mapped[PillarCode] = mapped_column(
        Enum(PillarCode, name="pillar_code"), nullable=False, index=True
    )
    source: Mapped[ResultSource] = mapped_column(
        Enum(ResultSource, name="result_source"), nullable=False, default=ResultSource.preliminary
    )
    state_code: Mapped[str] = mapped_column(String(20), nullable=False)
    state_label: Mapped[str] = mapped_column(String(120), nullable=False)
    sub_scores: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    requires_user_confirmation: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    user_confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    recaida_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    suggested_next_step: Mapped[str | None] = mapped_column(String(2000))
    derived_from_session_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("assessment_sessions.id", ondelete="SET NULL")
    )
    derived_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    next_retake_eligible_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
