"""Pydantic v2 schemas de soporte (ADR-0015)."""
from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from hg.modules.support.models import TicketCategory, TicketSeverity, TicketStatus

# `str` y no EmailStr (igual que marketing/identity): email-validator rechaza TLDs como `.test`.
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean(value: str) -> str:
    return value.strip()


class _Text(BaseModel):
    @field_validator("*", mode="before")
    @classmethod
    def _strip_strings(cls, v: object) -> object:
        return _clean(v) if isinstance(v, str) else v


# ─────────────────────────── Entrada ───────────────────────────


class TicketCreateIn(_Text):
    """Ticket desde la app (usuario autenticado). Org, usuario, rol, versión y user-agent los
    pone el servidor; el cliente solo aporta lo que no puede saber el backend."""

    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=5, max_length=5000)
    category: TicketCategory = TicketCategory.other
    page_url: str | None = Field(default=None, max_length=500)
    locale: str | None = Field(default=None, max_length=8)


class PublicTicketIn(_Text):
    name: str = Field(min_length=1, max_length=255)
    email: str = Field(min_length=3, max_length=254)
    subject: str = Field(min_length=3, max_length=200)
    body: str = Field(min_length=5, max_length=5000)
    category: TicketCategory = TicketCategory.access
    page_url: str | None = Field(default=None, max_length=500)
    locale: str | None = Field(default=None, max_length=8)
    # Honeypot: un humano no ve este campo; si llega con valor es un bot.
    website: str | None = Field(default=None, max_length=200)

    @field_validator("email")
    @classmethod
    def _valid_email(cls, v: str) -> str:
        if not _EMAIL_RE.match(v):
            raise ValueError("invalid email")
        return v.lower()


class ReplyIn(_Text):
    body: str = Field(min_length=1, max_length=5000)


class AdminReplyIn(ReplyIn):
    send_email: bool = True


class AdminTicketPatch(BaseModel):
    status: TicketStatus | None = None
    category: TicketCategory | None = None
    severity: TicketSeverity | None = None


# ─────────────────────────── Salida (usuario) ───────────────────────────


class MyEventOut(BaseModel):
    """Evento visible para el usuario: sin notas internas ni datos técnicos."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    actor_kind: str
    body: str | None
    created_at: datetime


class MyTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    subject: str
    body: str
    category: str
    status: str
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None


class MyTicketDetailOut(MyTicketOut):
    events: list[MyEventOut]


class MyTicketListResponse(BaseModel):
    items: list[MyTicketOut]
    total: int


# ─────────────────────────── Salida (admin) ───────────────────────────


class AdminEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    event_type: str
    actor_kind: str
    actor_user_id: UUID | None
    body: str | None
    data: dict | None  # type: ignore[type-arg]
    is_internal: bool
    created_at: datetime


class AdminTicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    code: str
    org_id: UUID | None
    user_id: UUID | None
    reporter_email: str
    reporter_name: str | None
    subject: str
    body: str
    category: str
    severity: str
    status: str
    source: str
    page_url: str | None
    user_agent: str | None
    app_version: str | None
    reporter_role: str | None
    locale: str | None
    first_response_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class AdminTicketDetailOut(AdminTicketOut):
    events: list[AdminEventOut]


class AdminTicketListResponse(BaseModel):
    items: list[AdminTicketOut]
    total: int
