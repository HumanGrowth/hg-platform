"""Soporte (ADR-0015): tickets y su historial de eventos.

- ``SupportTicket`` — RLS por org (``tenant_isolation``). ``org_id`` es NULL **solo** en tickets
  del formulario público: una fila con ``org_id NULL`` nunca satisface la política, así que es
  invisible para ``hg_app`` y la opera únicamente ``hg_superadmin``. Un ticket público no se
  vincula a un usuario por su email (ver ADR-0015, punto 2).
- ``SupportTicketEvent`` — append-only (``hg_app`` solo tiene SELECT/INSERT). Las notas internas
  (``is_internal``) nunca se exponen en ``/me``.

``category``/``severity``/``status`` son ``String`` validados por los enums Python de abajo (y por
los schemas Pydantic) en vez de enums de Postgres: agregar un estado no exige migrar un tipo.
"""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class TicketCategory(str, enum.Enum):
    bug = "bug"
    question = "question"
    access = "access"
    suggestion = "suggestion"
    other = "other"


class TicketSeverity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class TicketStatus(str, enum.Enum):
    """``new`` = requiere atención de soporte (también al reabrir por respuesta del usuario)."""

    new = "new"
    triaged = "triaged"
    needs_info = "needs_info"
    answered = "answered"
    fix_proposed = "fix_proposed"
    resolved = "resolved"
    wontfix = "wontfix"


CLOSED_STATUSES = frozenset({TicketStatus.resolved, TicketStatus.wontfix})


class TicketSource(str, enum.Enum):
    app = "app"
    public = "public"


class EventType(str, enum.Enum):
    created = "created"
    message_user = "message_user"
    message_admin = "message_admin"
    note = "note"
    status_changed = "status_changed"
    field_changed = "field_changed"


class ActorKind(str, enum.Enum):
    user = "user"
    admin = "admin"
    ai = "ai"
    system = "system"


class SupportTicket(Base):
    __tablename__ = "support_tickets"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(16), nullable=False, unique=True)
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    reporter_email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    reporter_name: Mapped[str | None] = mapped_column(String(255))
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(String(5000), nullable=False)
    category: Mapped[str] = mapped_column(String(24), nullable=False, default="other")
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="medium")
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="new", index=True)
    source: Mapped[str] = mapped_column(String(16), nullable=False)
    # Contexto automático (solo tickets desde la app; el público lo manda el cliente sin garantía).
    page_url: Mapped[str | None] = mapped_column(String(500))
    user_agent: Mapped[str | None] = mapped_column(String(300))
    app_version: Mapped[str | None] = mapped_column(String(40))
    reporter_role: Mapped[str | None] = mapped_column(String(32))
    locale: Mapped[str | None] = mapped_column(String(8))
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class SupportTicketEvent(Base):
    __tablename__ = "support_ticket_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    # Denormalizado desde el ticket para que RLS filtre sin join. NULL = ticket público.
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(24), nullable=False)
    actor_kind: Mapped[str] = mapped_column(String(16), nullable=False)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    body: Mapped[str | None] = mapped_column(Text)
    data: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class SupportTicketAttachment(Base):
    """Archivo de respaldo del ticket (screenshot, PDF, log). Append-only; RLS igual que el ticket.

    Se guarda en la base y no en R2 público: puede contener datos personales (SP-03)."""

    __tablename__ = "support_ticket_attachments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    ticket_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("support_tickets.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    org_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    filename: Mapped[str] = mapped_column(String(120), nullable=False)
    content_type: Mapped[str] = mapped_column(String(64), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False, deferred=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
