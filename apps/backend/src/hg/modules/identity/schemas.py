"""Pydantic v2 schemas for identity (auth + admin)."""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from hg.modules.identity.models import CareerLevel, OrgTier, UserRole

# Nota: usamos `str` (no EmailStr) para emails porque email-validator rechaza
# TLDs reservados como `.test`, que es el dominio de las orgs demo del spec.
Email = str

# ─────────────────────────── Auth ───────────────────────────


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: UserRole
    org_id: UUID
    career_level: CareerLevel | None = None


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class MeResponse(UserOut):
    """UserOut + nombre de la org del usuario (para el header de perfil)."""

    org_name: str


class LoginRequest(BaseModel):
    email: Email
    password: str
    org_slug: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


class LogoutRequest(BaseModel):
    refresh_token: str


class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(min_length=10)
    full_name: str = Field(min_length=1, max_length=255)


# ─────────────────────────── Admin / Orgs ───────────────────────────


class CreateOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    tier: OrgTier = OrgTier.C
    country: str | None = Field(default=None, max_length=2)
    billing_status: str = "trial"
    billing_cycle: str | None = None
    contract_start: date | None = None
    contract_end: date | None = None
    licenses_total: int = Field(default=0, ge=0)
    primary_color: str | None = Field(default=None, max_length=7)
    logo_url: str | None = Field(default=None, max_length=2048)


class OrgOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    tier: OrgTier
    country: str | None
    billing_status: str
    billing_cycle: str | None
    licenses_total: int
    licenses_used: int
    is_active: bool
    created_at: datetime


class OrgListResponse(BaseModel):
    items: list[OrgOut]
    total: int
    limit: int
    offset: int


# ─────────────────────────── Invitations ───────────────────────────


class InviteRequest(BaseModel):
    email: Email
    role: UserRole = UserRole.collaborator


class InviteResponse(BaseModel):
    """Respuesta al crear una invitación. El plaintext del token se muestra
    UNA SOLA VEZ; en DB sólo queda el hash."""

    invitation_id: UUID
    email: str
    role: UserRole
    invite_token: str
    invite_url: str
    expires_at: datetime


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    role: UserRole
    expires_at: datetime
    accepted_at: datetime | None
    revoked_at: datetime | None
    created_at: datetime


class InviteInfoResponse(BaseModel):
    """Vista pública (read-only) de una invitación por token, para precargar la
    pantalla de accept-invite. No consume la invitación ni filtra el hash."""

    email: str
    role: UserRole
    org_name: str
    status: str  # pending | accepted | revoked | expired
