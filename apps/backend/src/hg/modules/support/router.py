"""Routers de soporte (ADR-0015).

- ``me_router`` (``/me/support/tickets``): usuario autenticado, RLS por org vía ``get_db``;
  además filtra por ``user_id`` — ve solo sus propios tickets y nunca las notas internas.
- ``public_router`` (``POST /support/tickets``): sin auth, corre bajo ``hg_superadmin`` (el ticket
  queda sin org). Anti-abuso: honeypot + límite por IP, por email y global (Redis).
- ``admin_router`` (``/admin/support/tickets``): solo superadmin, cross-tenant.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from hg.config import get_settings
from hg.core import rate_limit
from hg.core.deps import get_current_user, get_db_as_superadmin, require_role
from hg.db import get_db
from hg.modules.identity.models import User
from hg.modules.support import service
from hg.modules.support.models import SupportTicket, TicketCategory, TicketStatus
from hg.modules.support.schemas import (
    AdminEventOut,
    AdminReplyIn,
    AdminTicketDetailOut,
    AdminTicketListResponse,
    AdminTicketOut,
    AdminTicketPatch,
    MyEventOut,
    MyTicketDetailOut,
    MyTicketListResponse,
    MyTicketOut,
    PublicTicketIn,
    ReplyIn,
    TicketCreateIn,
)

log = logging.getLogger("hg.support")

me_router = APIRouter()
public_router = APIRouter()
admin_router = APIRouter()


def _client_ip(request: Request) -> str:
    """IP del cliente. Detrás del proxy de Railway/Cloudflare el primer valor de
    ``X-Forwarded-For`` es el cliente; si alguien llega directo puede falsearlo, por eso además
    hay límite por email y global."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _my_detail(db: Session, ticket: SupportTicket) -> MyTicketDetailOut:
    base = MyTicketOut.model_validate(ticket)
    events = [
        MyEventOut.model_validate(e)
        for e in service.events_for(db, ticket.id, include_internal=False)
    ]
    return MyTicketDetailOut(**base.model_dump(), events=events)


# ─────────────────────────── Usuario autenticado ───────────────────────────


@me_router.post(
    "/support/tickets", response_model=MyTicketDetailOut, status_code=status.HTTP_201_CREATED
)
def create_my_ticket(
    payload: TicketCreateIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyTicketDetailOut:
    ticket = service.create_ticket_for_user(
        db,
        user=current_user,
        subject=payload.subject,
        body=payload.body,
        category=payload.category,
        page_url=payload.page_url,
        locale=payload.locale,
        user_agent=request.headers.get("user-agent"),
    )
    service.send_ack_email(ticket)
    service.send_internal_notification(ticket)
    return _my_detail(db, ticket)


@me_router.get("/support/tickets", response_model=MyTicketListResponse)
def list_my_tickets(
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyTicketListResponse:
    rows, total = service.list_my_tickets(db, current_user, limit=limit, offset=offset)
    return MyTicketListResponse(
        items=[MyTicketOut.model_validate(r) for r in rows], total=total
    )


@me_router.get("/support/tickets/{ticket_id}", response_model=MyTicketDetailOut)
def get_my_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyTicketDetailOut:
    ticket = service.get_my_ticket(db, current_user, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ticket not found")
    return _my_detail(db, ticket)


@me_router.post("/support/tickets/{ticket_id}/reply", response_model=MyTicketDetailOut)
def reply_my_ticket(
    ticket_id: uuid.UUID,
    payload: ReplyIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MyTicketDetailOut:
    ticket = service.get_my_ticket(db, current_user, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ticket not found")
    service.user_reply(db, ticket, current_user, payload.body)
    return _my_detail(db, ticket)


# ─────────────────────────── Público ───────────────────────────


@public_router.post("/support/tickets", status_code=status.HTTP_201_CREATED)
def submit_public_ticket(
    payload: PublicTicketIn,
    request: Request,
    db: Session = Depends(get_db_as_superadmin),
) -> dict[str, bool]:
    # Honeypot: responde igual que un éxito para no darle pistas al bot, pero no guarda nada.
    if payload.website:
        log.info("support.public.honeypot")
        return {"ok": True}

    settings = get_settings()
    allowed = (
        rate_limit.allow(
            "support_pub_ip", _client_ip(request),
            limit=settings.support_public_rate_per_ip_hour,
        )
        and rate_limit.allow(
            "support_pub_email", payload.email,
            limit=settings.support_public_rate_per_email_hour,
        )
        and rate_limit.allow(
            "support_pub_global", "all", limit=settings.support_public_rate_global_hour
        )
    )
    if not allowed:
        log.warning("support.public.rate_limited")
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="too many requests",
            headers={"Retry-After": "3600"},
        )

    ticket = service.create_public_ticket(
        db,
        name=payload.name,
        email=payload.email,
        subject=payload.subject,
        body=payload.body,
        category=payload.category,
        page_url=payload.page_url,
        locale=payload.locale,
        user_agent=request.headers.get("user-agent"),
    )
    service.send_ack_email(ticket)
    service.send_internal_notification(ticket)
    return {"ok": True}


# ─────────────────────────── Admin (superadmin) ───────────────────────────


def _admin_detail(db: Session, ticket: SupportTicket) -> AdminTicketDetailOut:
    base = AdminTicketOut.model_validate(ticket)
    events = [
        AdminEventOut.model_validate(e)
        for e in service.events_for(db, ticket.id, include_internal=True)
    ]
    return AdminTicketDetailOut(**base.model_dump(), events=events)


def _admin_ticket_or_404(db: Session, ticket_id: uuid.UUID) -> SupportTicket:
    ticket = service.get_ticket(db, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ticket not found")
    return ticket


@admin_router.get("/support/tickets", response_model=AdminTicketListResponse)
def admin_list_tickets(
    status_filter: TicketStatus | None = Query(default=None, alias="status"),
    category: TicketCategory | None = None,
    q: str | None = Query(default=None, max_length=100),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> AdminTicketListResponse:
    rows, total = service.list_tickets(
        db, status=status_filter, category=category, q=q, limit=limit, offset=offset
    )
    return AdminTicketListResponse(
        items=[AdminTicketOut.model_validate(r) for r in rows], total=total
    )


@admin_router.get("/support/tickets/{ticket_id}", response_model=AdminTicketDetailOut)
def admin_get_ticket(
    ticket_id: uuid.UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> AdminTicketDetailOut:
    return _admin_detail(db, _admin_ticket_or_404(db, ticket_id))


@admin_router.post("/support/tickets/{ticket_id}/reply", response_model=AdminTicketDetailOut)
def admin_reply_ticket(
    ticket_id: uuid.UUID,
    payload: AdminReplyIn,
    db: Session = Depends(get_db_as_superadmin),
    admin: User = Depends(require_role("superadmin")),
) -> AdminTicketDetailOut:
    ticket = _admin_ticket_or_404(db, ticket_id)
    service.admin_reply(db, ticket, admin, payload.body, send_email=payload.send_email)
    return _admin_detail(db, ticket)


@admin_router.post("/support/tickets/{ticket_id}/note", response_model=AdminTicketDetailOut)
def admin_note_ticket(
    ticket_id: uuid.UUID,
    payload: ReplyIn,
    db: Session = Depends(get_db_as_superadmin),
    admin: User = Depends(require_role("superadmin")),
) -> AdminTicketDetailOut:
    ticket = _admin_ticket_or_404(db, ticket_id)
    service.admin_note(db, ticket, admin, payload.body)
    return _admin_detail(db, ticket)


@admin_router.patch("/support/tickets/{ticket_id}", response_model=AdminTicketDetailOut)
def admin_patch_ticket(
    ticket_id: uuid.UUID,
    payload: AdminTicketPatch,
    db: Session = Depends(get_db_as_superadmin),
    admin: User = Depends(require_role("superadmin")),
) -> AdminTicketDetailOut:
    ticket = _admin_ticket_or_404(db, ticket_id)
    service.admin_update(
        db, ticket, admin,
        status=payload.status, category=payload.category, severity=payload.severity,
    )
    return _admin_detail(db, ticket)
