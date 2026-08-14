"""Badges / Logros (Sprint Tarde · TASK 4).

- Catálogo global (sin RLS): ``Badge`` — lo define admin (esquema genérico, el
  catálogo concreto se carga después).
- Por usuario (RLS por org): ``UserBadge`` — qué badges desbloqueó cada user.
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class Badge(Base):
    """Catálogo de badges (global, sin RLS)."""

    __tablename__ = "badges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(String(2000), nullable=False, default="")
    icon_url: Mapped[str] = mapped_column(String(500), nullable=False)
    unlock_hint: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class UserBadge(Base):
    """Badge desbloqueado por un usuario (RLS por org, tenant_isolation)."""

    __tablename__ = "user_badges"

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
    badge_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("badges.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("user_id", "badge_id", name="uq_user_badge"),)


# ─────────────────────────── Progresión por dimensión (Capa Empresa · TASK 6) ───────────────────────────


class DimensionScoringConfig(Base):
    """Pesos de la mezcla aprendizaje/assessment por dimensión (config global, sin
    RLS). Default 0.70/0.30; una dimensión sin contenido de aprendizaje puede tener
    ``learning_weight=0`` (se apoya solo en el assessment) y viceversa."""

    __tablename__ = "dimension_scoring_config"

    dimension_code: Mapped[str] = mapped_column(String(4), primary_key=True)  # CP/PR/RE/SA/PI/ES
    learning_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.7)
    assessment_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.3)


class DimensionLevel(Base):
    """Nivel configurable de una dimensión (config global, sin RLS). Cada dimensión
    puede tener distinta cantidad/nombres de niveles. ``unlock_threshold`` = % de
    completion para ganar el badge del nivel (típico 100)."""

    __tablename__ = "dimension_levels"
    __table_args__ = (
        UniqueConstraint("dimension_code", "level_code", name="uq_dimension_level"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dimension_code: Mapped[str] = mapped_column(String(4), nullable=False, index=True)
    level_code: Mapped[str] = mapped_column(String(8), nullable=False)  # L1/L2/L3…
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    name: Mapped[str] = mapped_column(String(80), nullable=False)  # "En crecimiento"…
    unlock_threshold: Mapped[int] = mapped_column(Integer, nullable=False, default=100)


class DimensionLevelProgress(Base):
    """Completion 0-100 de un ``(user, dimensión, nivel)`` = mezcla aprendizaje +
    assessment (RLS por org, tenant_isolation). Se recalcula al completar un bloque
    y al derivar/confirmar un ``DimensionResult``."""

    __tablename__ = "dimension_level_progress"
    __table_args__ = (
        UniqueConstraint(
            "user_id", "dimension_code", "level_code", name="uq_dimension_level_progress"
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    dimension_code: Mapped[str] = mapped_column(String(4), nullable=False)
    level_code: Mapped[str] = mapped_column(String(8), nullable=False)
    completion_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    learning_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    assessment_pct: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
