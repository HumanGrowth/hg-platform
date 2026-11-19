"""Modelos del módulo de notificaciones (ADR-0018).

- ``EngagementReminder``: log de avisos por email (aprendizaje + resumen del líder) —
  evita reenviar el mismo email todos los días y alimenta el tope semanal.
- ``NotificationPreference``: preferencias de la persona, gestionadas desde su Perfil.

No hay unicidad a nivel de DB en ``engagement_reminders``: la dedupe la decide la
query del task (ver ``hg.modules.notifications.tasks``), porque las reglas de
"cuándo se puede volver a enviar" difieren por tipo:

- **Inactividad** (``inactivity_7d`` / ``inactivity_21d``): se puede reenviar en
  un futuro episodio de inactividad — la consulta compara contra la actividad
  más reciente del user (``sent_at > last_active_at`` ⇒ ya se avisó de ESTE
  episodio).
- **Due date** (``assignment_due_soon`` / ``assignment_due_today``): una sola
  vez por ``(user, assignment, kind)`` — no hay "episodios" que reiniciar.
- **Resumen del líder** (``leader_weekly_digest``): uno por semana (lo decide la
  compuerta, ``hg.modules.notifications.service``).

Deuda anotada (ADR-0018): ``engagement_reminders`` pasaría a llamarse
``notification_log``; no urge y evita migrar datos.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class EngagementReminder(Base):
    __tablename__ = "engagement_reminders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # 'inactivity_7d' | 'inactivity_21d' | 'assignment_due_soon' | 'assignment_due_today'
    # | 'content_unlocked' | 'leader_weekly_digest'
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    # ModuleAssignment.id para los kinds de due date; NULL para inactividad.
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class NotificationPreference(Base):
    """Preferencias de notificación de una persona (ADR-0018 · NT-01).

    Una fila por usuario, por-org con RLS (``tenant_isolation``). Misma semántica
    que ``UserPrivacyConsent``: ``None`` = nunca decidió, ``True`` = acepta,
    ``False`` = apagó. Cómo se trata ``None`` lo decide el servicio
    (``_allows_learning`` / ``_allows_digest``), no el modelo.

    Los avisos transaccionales (invitación, contraseña, soporte, licencias) no
    dependen de esta tabla: se envían siempre.
    """

    __tablename__ = "notification_preferences"
    __table_args__ = (UniqueConstraint("user_id", name="uq_notification_preferences_user"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Recordatorios de aprendizaje (inactividad, vencimientos, módulos asignados).
    learning_reminders: Mapped[bool | None] = mapped_column(Boolean)
    # Resumen semanal del líder (solo aplica a quien tiene reportes directos).
    leader_digest: Mapped[bool | None] = mapped_column(Boolean)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
