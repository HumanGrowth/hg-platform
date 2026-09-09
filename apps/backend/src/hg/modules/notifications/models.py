"""Log de recordatorios de engagement (inactividad + due dates) — evita
reenviar el mismo email todos los días.

No hay unicidad a nivel de DB: la dedupe la decide la query del task (ver
``hg.modules.notifications.tasks``), porque las reglas de "cuándo se puede
volver a enviar" difieren por tipo:

- **Inactividad** (``inactivity_7d`` / ``inactivity_21d``): se puede reenviar en
  un futuro episodio de inactividad — la consulta compara contra la actividad
  más reciente del user (``sent_at > last_active_at`` ⇒ ya se avisó de ESTE
  episodio).
- **Due date** (``assignment_due_soon`` / ``assignment_due_today``): una sola
  vez por ``(user, assignment, kind)`` — no hay "episodios" que reiniciar.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
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
    kind: Mapped[str] = mapped_column(String(30), nullable=False)
    # ModuleAssignment.id para los kinds de due date; NULL para inactividad.
    reference_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    sent_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
