"""Modelos de la Capa Empresa propios del módulo company.

La Empresa (``Company``) vive en ``identity.models`` (junto a Organization/User,
por el ciclo de FKs). Acá van los modelos que NO pertenecen a identity:
``CompanyAreaAccess`` = entitlements de Áreas de contenido por Empresa (TASK 8).
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
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
