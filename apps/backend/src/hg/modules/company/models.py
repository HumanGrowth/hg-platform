"""Modelos de la Capa Empresa propios del módulo company.

La Empresa (``Company``) vive en ``identity.models`` (junto a Organization/User,
por el ciclo de FKs). Acá van los modelos que NO pertenecen a identity:
``CompanyAreaAccess`` = entitlements de Áreas de contenido por Empresa (TASK 8).
"""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class CompanyAreaAccess(Base):
    """Entitlement: una Empresa tiene acceso a un Área de contenido (TASK 8).

    Catálogo global sin RLS (gobernado por superadmin). Un row = "esta Empresa
    puede ver esta Área". El contenido general (``LearningUnit.area_code = NULL``)
    es visible para todas las empresas sin necesitar un row acá.
    """

    __tablename__ = "company_area_access"
    __table_args__ = (UniqueConstraint("company_id", "area_code", name="uq_company_area"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    area_code: Mapped[str] = mapped_column(
        String(10), ForeignKey("areas.code", ondelete="CASCADE"), nullable=False
    )
    granted_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    granted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CompanyLifecycleEvent(Base):
    """Auditoría del ciclo de vida de una Empresa (ADR-0016). **APPEND-ONLY**.

    Sin RLS (raíz de tenant, mismo criterio que ``companies``): solo la opera
    superadmin / servicios con ``hg_superadmin``. La migración LC-01 hace
    ``REVOKE UPDATE, DELETE`` a todos los roles; no hay forma de editarla desde la app.
    """

    __tablename__ = "company_lifecycle_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    # status_change | overage_acknowledged | grace_extended | …
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    from_status: Mapped[str | None] = mapped_column(String(20))
    to_status: Mapped[str | None] = mapped_column(String(20))
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    reason: Mapped[str | None] = mapped_column(Text)
    # `metadata` está reservado por SQLAlchemy: atributo `meta`, columna `metadata`.
    meta: Mapped[dict[str, Any]] = mapped_column(
        "metadata", JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
