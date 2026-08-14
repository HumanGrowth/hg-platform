"""Modelos de consentimiento + auditoría de acceso (Capa Empresa · TASK 5).

Fase 1 de seguridad (BLOQUEANTE para prod). Con RRHH/manager viendo el `state`
por dimensión de cada colaborador, esos datos pasan de privados del usuario a
visibles por su empleador → requiere **consentimiento explícito** + **trazabilidad**.

- ``UserConsent``: el colaborador aceptó una versión del consentimiento (qué ve
  RRHH y para qué). Sin un row con la versión vigente, los endpoints de RRHH/
  manager NO exponen su `state` individual (queda "sin datos"; sí cuenta en
  agregados anónimos).
- ``DataAccessLog``: append-only. Un registro cada vez que un ``company_admin``/
  ``admin``/``manager`` consulta el `state` o el detalle de un colaborador.

Ambas son tablas por-org con RLS (``tenant_isolation`` sobre ``app.current_org_id``),
igual que el resto del modelo multi-tenant.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class UserConsent(Base):
    """Aceptación de una versión del consentimiento por un colaborador.

    Idempotente por ``(user_id, consent_version)`` — reaceptar la misma versión
    no crea filas nuevas. Al publicar una versión nueva, el consentimiento viejo
    deja de contar (el gate compara contra la versión vigente)."""

    __tablename__ = "user_consents"
    __table_args__ = (
        UniqueConstraint("user_id", "consent_version", name="uq_user_consent_version"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    consent_version: Mapped[str] = mapped_column(String(40), nullable=False)
    accepted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class DataAccessLog(Base):
    """Registro append-only de acceso de RRHH/manager a datos de un colaborador.

    ``resource`` ∈ {``assessment_state``, ``progress``, ``roster``}. ``target_user_id``
    es NULL para vistas de lista (``roster``), donde el acceso no apunta a un
    colaborador puntual."""

    __tablename__ = "data_access_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    target_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    resource: Mapped[str] = mapped_column(String(32), nullable=False)
    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


# ─────────────────────────── Consentimiento granular v2 (TASK 5 · docx v1.0) ───────────────────────────


class UserPrivacyConsent(Base):
    """Preferencias de visibilidad del colaborador hacia su empresa (Ley 8968 CR,
    opt-in). Dos autorizaciones **independientes**; ``None`` = pendiente (nunca vio
    la pantalla), ``True`` = autorizó, ``False`` = declinó/revocó.

    Por-org con RLS. Declinar NO bloquea el contenido del colaborador, solo la
    visibilidad hacia RRHH/jefe directo."""

    __tablename__ = "user_privacy_consent"
    __table_args__ = (UniqueConstraint("user_id", name="uq_user_privacy_consent_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # None = pendiente · True = autorizado · False = declinado/revocado.
    consent_manager: Mapped[bool | None] = mapped_column(Boolean)
    consent_hr: Mapped[bool | None] = mapped_column(Boolean)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ConsentChangeLog(Base):
    """Historial append-only de cambios de consentimiento (auditoría Ley 8968).
    Un row por cambio de un scope (``manager``/``hr``) a un valor."""

    __tablename__ = "consent_change_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    scope: Mapped[str] = mapped_column(String(16), nullable=False)  # manager | hr
    value: Mapped[bool] = mapped_column(Boolean, nullable=False)
    changed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
