"""Lógica de soporte (ADR-0015). Los routers quedan finos; todo el estado se toca acá.

Nunca ``db.commit()``: solo ``flush`` (el commit lo hace la dependencia de sesión; ver
invariante 2 de CLAUDE.md).
"""
from __future__ import annotations

import logging
import re
import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import func, or_, select, text
from sqlalchemy.orm import Session

from hg import __version__
from hg.config import get_settings
from hg.modules.identity.models import User
from hg.modules.notifications.email_service import email_service
from hg.modules.support.models import (
    CLOSED_STATUSES,
    ActorKind,
    EventType,
    SupportTicket,
    SupportTicketEvent,
    TicketCategory,
    TicketSeverity,
    TicketSource,
    TicketStatus,
)

log = logging.getLogger("hg.support")

_CONTROL_CHARS = re.compile(r"[\r\n\t\x00-\x1f]+")


def app_version() -> str:
    """SHA desplegado si el deploy lo inyecta; si no, la versión del paquete."""
    settings = get_settings()
    return (settings.git_sha or __version__)[:40]


def _subject_line(subject: str) -> str:
    """Una línea sin caracteres de control, para usar en el asunto de un email."""
    return _CONTROL_CHARS.sub(" ", subject).strip()[:120]


def _next_code(db: Session) -> str:
    n = db.execute(text("SELECT nextval('support_ticket_code_seq')")).scalar_one()
    return f"SP-{int(n):04d}"


def add_event(
    db: Session,
    ticket: SupportTicket,
    *,
    event_type: EventType,
    actor_kind: ActorKind,
    actor_user_id: uuid.UUID | None = None,
    body: str | None = None,
    data: dict[str, Any] | None = None,
    is_internal: bool = False,
) -> SupportTicketEvent:
    event = SupportTicketEvent(
        ticket_id=ticket.id,
        org_id=ticket.org_id,
        event_type=event_type.value,
        actor_kind=actor_kind.value,
        actor_user_id=actor_user_id,
        body=body,
        data=data,
        is_internal=is_internal,
    )
    db.add(event)
    db.flush()
    return event


# ─────────────────────────── Creación ───────────────────────────


def create_ticket_for_user(
    db: Session,
    *,
    user: User,
    subject: str,
    body: str,
    category: TicketCategory,
    page_url: str | None,
    locale: str | None,
    user_agent: str | None,
) -> SupportTicket:
    ticket = SupportTicket(
        code=_next_code(db),
        org_id=user.org_id,
        user_id=user.id,
        reporter_email=user.email,
        reporter_name=user.full_name,
        subject=subject,
        body=body,
        category=category.value,
        severity=TicketSeverity.medium.value,
        status=TicketStatus.new.value,
        source=TicketSource.app.value,
        page_url=page_url,
        user_agent=(user_agent or None) and user_agent[:300],
        app_version=app_version(),
        reporter_role=user.role.value,
        locale=locale,
    )
    db.add(ticket)
    db.flush()
    add_event(
        db, ticket, event_type=EventType.created, actor_kind=ActorKind.user,
        actor_user_id=user.id,
    )
    return ticket


def create_public_ticket(
    db: Session,
    *,
    name: str,
    email: str,
    subject: str,
    body: str,
    category: TicketCategory,
    page_url: str | None,
    locale: str | None,
    user_agent: str | None,
) -> SupportTicket:
    """Ticket del formulario público: sin org y sin usuario (ADR-0015, punto 2)."""
    ticket = SupportTicket(
        code=_next_code(db),
        org_id=None,
        user_id=None,
        reporter_email=email,
        reporter_name=name,
        subject=subject,
        body=body,
        category=category.value,
        severity=TicketSeverity.medium.value,
        status=TicketStatus.new.value,
        source=TicketSource.public.value,
        page_url=page_url,
        user_agent=(user_agent or None) and user_agent[:300],
        app_version=app_version(),
        locale=locale,
    )
    db.add(ticket)
    db.flush()
    add_event(db, ticket, event_type=EventType.created, actor_kind=ActorKind.user)
    return ticket


# ─────────────────────────── Cambios de estado ───────────────────────────


def _set_status(
    db: Session,
    ticket: SupportTicket,
    new_status: TicketStatus,
    *,
    actor_kind: ActorKind,
    actor_user_id: uuid.UUID | None,
) -> None:
    old = ticket.status
    if old == new_status.value:
        return
    ticket.status = new_status.value
    if new_status in CLOSED_STATUSES:
        ticket.resolved_at = datetime.now(UTC)
    else:
        ticket.resolved_at = None
    db.flush()
    add_event(
        db, ticket, event_type=EventType.status_changed, actor_kind=actor_kind,
        actor_user_id=actor_user_id, data={"from": old, "to": new_status.value},
    )


# ─────────────────────────── Usuario ───────────────────────────


def user_reply(db: Session, ticket: SupportTicket, user: User, body: str) -> SupportTicketEvent:
    """Respuesta del usuario. Si el ticket estaba contestado, pidiendo info o cerrado, vuelve a
    ``new`` para que soporte lo vea."""
    event = add_event(
        db, ticket, event_type=EventType.message_user, actor_kind=ActorKind.user,
        actor_user_id=user.id, body=body,
    )
    if ticket.status in {
        TicketStatus.answered.value,
        TicketStatus.needs_info.value,
        TicketStatus.resolved.value,
        TicketStatus.wontfix.value,
    }:
        _set_status(db, ticket, TicketStatus.new, actor_kind=ActorKind.system, actor_user_id=None)
    ticket.updated_at = datetime.now(UTC)
    db.flush()
    return event


def list_my_tickets(
    db: Session, user: User, *, limit: int, offset: int
) -> tuple[list[SupportTicket], int]:
    where = SupportTicket.user_id == user.id
    total = db.scalar(select(func.count()).select_from(SupportTicket).where(where)) or 0
    rows = db.scalars(
        select(SupportTicket).where(where)
        .order_by(SupportTicket.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return list(rows), total


def get_my_ticket(db: Session, user: User, ticket_id: uuid.UUID) -> SupportTicket | None:
    return db.scalar(
        select(SupportTicket).where(
            SupportTicket.id == ticket_id, SupportTicket.user_id == user.id
        )
    )


def events_for(
    db: Session, ticket_id: uuid.UUID, *, include_internal: bool
) -> list[SupportTicketEvent]:
    stmt = select(SupportTicketEvent).where(SupportTicketEvent.ticket_id == ticket_id)
    if not include_internal:
        stmt = stmt.where(
            SupportTicketEvent.is_internal.is_(False),
            SupportTicketEvent.event_type.in_(
                [EventType.message_user.value, EventType.message_admin.value]
            ),
        )
    return list(db.scalars(stmt.order_by(SupportTicketEvent.created_at.asc())).all())


# ─────────────────────────── Admin ───────────────────────────


def list_tickets(
    db: Session,
    *,
    status: TicketStatus | None,
    category: TicketCategory | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[SupportTicket], int]:
    stmt = select(SupportTicket)
    if status is not None:
        stmt = stmt.where(SupportTicket.status == status.value)
    if category is not None:
        stmt = stmt.where(SupportTicket.category == category.value)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                SupportTicket.subject.ilike(like),
                SupportTicket.reporter_email.ilike(like),
                SupportTicket.code.ilike(like),
            )
        )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(SupportTicket.created_at.desc()).limit(limit).offset(offset)
    ).all()
    return list(rows), total


def get_ticket(db: Session, ticket_id: uuid.UUID) -> SupportTicket | None:
    return db.get(SupportTicket, ticket_id)


def admin_reply(
    db: Session, ticket: SupportTicket, admin: User, body: str, *, send_email: bool
) -> SupportTicketEvent:
    event = add_event(
        db, ticket, event_type=EventType.message_admin, actor_kind=ActorKind.admin,
        actor_user_id=admin.id, body=body,
    )
    if ticket.first_response_at is None:
        ticket.first_response_at = datetime.now(UTC)
    if ticket.status in {
        TicketStatus.new.value, TicketStatus.triaged.value, TicketStatus.needs_info.value
    }:
        _set_status(
            db, ticket, TicketStatus.answered, actor_kind=ActorKind.admin, actor_user_id=admin.id
        )
    db.flush()
    if send_email:
        send_reply_email(ticket, body)
    return event


def admin_note(db: Session, ticket: SupportTicket, admin: User, body: str) -> SupportTicketEvent:
    return add_event(
        db, ticket, event_type=EventType.note, actor_kind=ActorKind.admin,
        actor_user_id=admin.id, body=body, is_internal=True,
    )


def admin_update(
    db: Session,
    ticket: SupportTicket,
    admin: User,
    *,
    status: TicketStatus | None,
    category: TicketCategory | None,
    severity: TicketSeverity | None,
) -> SupportTicket:
    if status is not None:
        _set_status(db, ticket, status, actor_kind=ActorKind.admin, actor_user_id=admin.id)
    for field, value in (("category", category), ("severity", severity)):
        if value is not None and getattr(ticket, field) != value.value:
            old = getattr(ticket, field)
            setattr(ticket, field, value.value)
            db.flush()
            add_event(
                db, ticket, event_type=EventType.field_changed, actor_kind=ActorKind.admin,
                actor_user_id=admin.id, data={"field": field, "from": old, "to": value.value},
                is_internal=True,
            )
    ticket.updated_at = datetime.now(UTC)
    db.flush()
    return ticket


# ─────────────────────────── Emails (best-effort: nunca rompen el flujo) ───────────────────────────


def send_ack_email(ticket: SupportTicket) -> None:
    email_service.send(
        to=ticket.reporter_email,
        subject=f"Recibimos tu solicitud {ticket.code}",
        template="support_ack",
        context={
            "code": ticket.code,
            "name": ticket.reporter_name,
            "subject": _subject_line(ticket.subject),
            "app_url": get_settings().app_base_url if ticket.user_id else None,
        },
    )


def send_internal_notification(ticket: SupportTicket) -> None:
    email_service.send(
        to=get_settings().support_inbox,
        subject=f"[Soporte] {ticket.code} · {_subject_line(ticket.subject)}",
        template="support_internal",
        context={
            "code": ticket.code,
            "category": ticket.category,
            "source": ticket.source,
            "reporter_email": ticket.reporter_email,
            "reporter_name": ticket.reporter_name,
            "subject": _subject_line(ticket.subject),
            "body": ticket.body,
            "page_url": ticket.page_url,
            "app_version": ticket.app_version,
        },
    )


def send_reply_email(ticket: SupportTicket, body: str) -> None:
    email_service.send(
        to=ticket.reporter_email,
        subject=f"Re: {ticket.code} · {_subject_line(ticket.subject)}",
        template="support_reply",
        context={
            "code": ticket.code,
            "name": ticket.reporter_name,
            "body": body,
            "app_url": get_settings().app_base_url if ticket.user_id else None,
        },
    )
