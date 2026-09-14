"""Feedback del manager: matriz de comportamientos por pilar (FASE 1.1).

- ``PillarBehavior`` — catálogo GLOBAL sin RLS (gobernado por superadmin, como
  ``Badge``): los comportamientos observables de un ``(dimension_code,
  pillar_code)``. Data-driven — el texto lo edita/sembra un humano, el motor de
  score nunca lo hardcodea.
- ``BehaviorEvaluation`` — RLS por org (``tenant_isolation``, mismo patrón que
  ``UserBadge`` / ``DimensionLevelProgress``): la última calificación 1..3 de un
  manager sobre un ``(colaborador, comportamiento)``. Unique por
  ``(user_id, behavior_id)`` = upsert de "calificación vigente"; no hay tabla de
  histórico todavía (recomendación: si se necesita auditoría completa, agregar
  ``behavior_evaluation_history`` append-only más adelante).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class PillarBehavior(Base):
    """Comportamiento observable de un pilar (catálogo global, sin RLS)."""

    __tablename__ = "pillar_behaviors"
    __table_args__ = (
        UniqueConstraint(
            "dimension_code", "pillar_code", "order_index", name="uq_pillar_behavior_order"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dimension_code: Mapped[str] = mapped_column(String(4), nullable=False, index=True)
    pillar_code: Mapped[str] = mapped_column(String(8), nullable=False, index=True)
    text: Mapped[str] = mapped_column(String(500), nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class BehaviorEvaluation(Base):
    """Calificación vigente del manager sobre un comportamiento de un colaborador
    (RLS por org, ``tenant_isolation``). ``rating``: 1=sin_demostrar,
    2=en_progreso, 3=demostrando (ver ``feedback/scoring.py``)."""

    __tablename__ = "behavior_evaluations"
    __table_args__ = (
        UniqueConstraint("user_id", "behavior_id", name="uq_behavior_evaluation"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    behavior_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pillar_behaviors.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    rating: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    evaluated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    note: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
