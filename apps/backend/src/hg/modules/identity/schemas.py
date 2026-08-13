"""Pydantic v2 schemas for identity (auth + admin)."""
from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

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
    username: str | None = None
    role: UserRole
    org_id: UUID
    career_level: CareerLevel | None = None
    job_title: str | None = None
    has_seen_onboarding: bool = False


class OnboardingSeenRequest(BaseModel):
    """Marca (o resetea) si el usuario ya vio el tour de onboarding (Release TASK 6)."""

    seen: bool = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class MeResponse(UserOut):
    """UserOut + nombre de la org del usuario (para el header de perfil)."""

    org_name: str
    reports_count: int = 0
    # ¿El usuario ya completó la evaluación inicial (onboarding_short)? El
    # SessionGate del frontend usa este flag: si es False, redirige a
    # /onboarding/welcome. Se computa (no es columna): tiene >=1 resultado.
    has_completed_onboarding: bool = False


class MeUpdateRequest(BaseModel):
    """Campos que el usuario puede editar de su propio perfil (app-polish-05)."""

    full_name: str = Field(min_length=1, max_length=255)
    job_title: str | None = Field(default=None, max_length=120)


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
    # Release TASK 3.4: el form pide "usuario o correo" (único). `full_name` se
    # mantiene opcional para backward-compat con el frontend viejo.
    username_or_email: str | None = Field(default=None, min_length=1, max_length=254)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)

    @model_validator(mode="after")
    def _require_identifier(self) -> AcceptInviteRequest:
        if not (self.username_or_email or self.full_name):
            raise ValueError("username_or_email es obligatorio")
        return self


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
    # Cap opcional de la org (Capa Empresa · CE-01): NULL = sin cap propio.
    licenses_total: int | None
    licenses_used: int | None
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
    # Nombre opcional del invitado: si viene, se usa en el saludo del email en
    # vez de derivarlo del correo. No se persiste; sólo alimenta el template.
    name: str | None = Field(default=None, min_length=1, max_length=255)


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


# ─────────────────────────── Admin: users ───────────────────────────


class AdminUserOut(BaseModel):
    """Vista de usuario para el panel admin (más campos que UserOut)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str
    role: UserRole
    career_level: CareerLevel | None
    is_active: bool
    last_login_at: datetime | None
    last_active_at: datetime | None
    manager_id: UUID | None
    created_at: datetime


class UserAdminUpdate(BaseModel):
    is_active: bool | None = None
    role: UserRole | None = None
    manager_id: UUID | None = None
    career_level: CareerLevel | None = None


class PaginatedUsers(BaseModel):
    items: list[AdminUserOut]
    total: int
    page: int
    page_size: int
