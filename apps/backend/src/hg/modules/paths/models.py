"""Rutas de cursos customizables por Empresa/Organización (FASE 2.2).

Catálogo de la Capa Empresa **sin RLS** — mismo criterio que
``CompanyAreaAccess``/``Area``: ``CustomPath`` puede tener ``scope="company"``
(``org_id`` NULL, aplica a TODAS las orgs de la empresa) — un ``org_id``
NULLABLE no puede vivir bajo la policy ``tenant_isolation`` (que compara contra
``current_org_id``), así que la frontera de Empresa se impone en la app
(``get_db_as_superadmin`` + filtro por ``company_id`` en el router, igual que
``company/service.py``).

``CustomPathAssignment`` SÍ es por-usuario (para "miembros puntuales", el 3er
mecanismo del plan adjunto) y por eso SÍ lleva ``org_id`` + RLS
``tenant_isolation``, igual que ``ModuleAssignment``.
"""
from __future__ import annotations

import enum
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
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class CustomPathScope(str, enum.Enum):
    company = "company"
    org = "org"


class CustomPath(Base):
    """Ruta/grupo de cursos customizable. ``scope=company`` aplica a todas las
    orgs de la Empresa; ``scope=org`` solo a ``org_id`` (override de lo que
    diga la empresa para esa org — ver ``paths/resolution.py``)."""

    __tablename__ = "custom_paths"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str | None] = mapped_column(String(2000))
    scope: Mapped[CustomPathScope] = mapped_column(
        Enum(CustomPathScope, name="custom_path_scope"), nullable=False
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CustomPathItem(Base):
    """Unit dentro de una ruta custom, con orden. ``is_required`` es
    informativo para la UI (FASE 2.3) — no bloquea el avance del colaborador,
    que sigue siendo aditivo como todo el sistema de asignación."""

    __tablename__ = "custom_path_items"
    __table_args__ = (
        UniqueConstraint("custom_path_id", "learning_unit_id", name="uq_custom_path_item"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    custom_path_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("custom_paths.id", ondelete="CASCADE"), nullable=False, index=True
    )
    learning_unit_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("learning_units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)


class CustomPathAssignment(Base):
    """Ruta custom asignada a un MIEMBRO PUNTUAL (RLS por org, igual que
    ``ModuleAssignment``) — el 3er mecanismo de targeting del plan, además de
    ``scope=company``/``scope=org``. Gana precedencia sobre la resolución por
    scope (ver ``paths/resolution.resolve_custom_path``)."""

    __tablename__ = "custom_path_assignments"
    __table_args__ = (
        UniqueConstraint("custom_path_id", "user_id", name="uq_custom_path_assignment"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    custom_path_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("custom_paths.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
