"""Pydantic v2 schemas para la Capa Empresa (TASK 2)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from hg.modules.identity.models import OrgTier, UserRole

# ─────────────────────────── Superadmin: companies ───────────────────────────


class CreateCompanyRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    tier: OrgTier = OrgTier.C
    licenses_total: int = Field(default=0, ge=0)
    billing_status: str = "trial"


class CompanyOut(BaseModel):
    id: UUID
    name: str
    slug: str
    tier: OrgTier
    billing_status: str
    licenses_total: int  # pool
    licenses_used: int  # computado: users activos de todas sus orgs
    org_count: int
    is_active: bool
    created_at: datetime


# ─────────────────────────── company_admin: orgs ───────────────────────────


class CompanyOrgOut(BaseModel):
    id: UUID
    name: str
    slug: str
    tier: OrgTier
    licenses_total: int | None  # cap opcional de la org (NULL = sin cap propio)
    user_count: int


class CreateCompanyOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    tier: OrgTier = OrgTier.C
    country: str | None = Field(default=None, max_length=2)
    # Cap opcional de la org sobre el pool (NULL = sin cap propio).
    licenses_total: int | None = Field(default=None, ge=0)


# ─────────────────────────── company_admin: members (roster) ───────────────────────────


class MemberDimensionStateOut(BaseModel):
    state: str
    state_label: str
    source: str


class CompanyMemberOut(BaseModel):
    id: UUID
    full_name: str
    email: str
    role: UserRole
    org_id: UUID
    org_name: str
    is_active: bool
    last_active_at: datetime | None
    modules_completed: int
    modules_in_progress: int
    # Estados del assessment por dimensión (RRHH ve estados/score, NUNCA respuestas).
    dimension_states: dict[str, MemberDimensionStateOut]


class CompanyInviteRequest(BaseModel):
    email: str
    role: UserRole = UserRole.collaborator
    name: str | None = Field(default=None, min_length=1, max_length=255)


class UpdateMemberRequest(BaseModel):
    """Mover de org, cambiar manager, activar/desactivar (todo opcional)."""

    org_id: UUID | None = None
    manager_id: UUID | None = None
    is_active: bool | None = None


class CompanyInviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invitation_id: UUID
    email: str
    role: UserRole
    invite_url: str
    expires_at: datetime
