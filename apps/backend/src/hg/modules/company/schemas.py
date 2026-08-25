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
    # CE-06: la org es la unidad operativa; el pool de licencias vive en la
    # Empresa. CE-07: cada org tiene un cupo (license_quota) del pool.
    id: UUID
    name: str
    slug: str
    country: str | None = None
    user_count: int
    license_quota: int = 0


class CreateCompanyOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=100)
    country: str | None = Field(default=None, max_length=2)
    license_quota: int = Field(default=0, ge=0)


class UpdateOrgQuotaRequest(BaseModel):
    license_quota: int = Field(ge=0)


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
    manager_id: UUID | None = None
    manager_name: str | None = None
    is_active: bool
    last_active_at: datetime | None
    modules_completed: int
    modules_in_progress: int
    # Estado de consentimiento (docx §6.2): pending | declined |
    # authorized_no_activity | data_available. Reemplaza el "sin datos" genérico.
    consent_status: str
    # Estados del assessment por dimensión (RRHH ve estados/score, NUNCA respuestas).
    # Vacío salvo consent_status == data_available/authorized (autorización a RRHH).
    dimension_states: dict[str, MemberDimensionStateOut]


class CompanyInviteRequest(BaseModel):
    email: str
    role: UserRole = UserRole.collaborator
    name: str | None = Field(default=None, min_length=1, max_length=255)


class UpdateMemberRequest(BaseModel):
    """Mover de org, cambiar manager, cambiar rol, activar/desactivar (opcional)."""

    org_id: UUID | None = None
    manager_id: UUID | None = None
    is_active: bool | None = None
    role: UserRole | None = None


class CompanyInviteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    invitation_id: UUID
    email: str
    role: UserRole
    invite_url: str
    expires_at: datetime


# ─────────────────────────── Superadmin: Áreas de contenido (TASK 8) ───────────────────────────

_AREA_CODE_RE = r"^[A-Z]{2,3}$"


class AreaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str
    description: str | None
    is_active: bool
    created_at: datetime


class CreateAreaRequest(BaseModel):
    code: str = Field(pattern=_AREA_CODE_RE)  # MFG/IT/CC… (2-3 letras)
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)


class UpdateAreaRequest(BaseModel):
    """Todo opcional; el ``code`` es inmutable (es PK y FK del contenido)."""

    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class CompanyAccessOut(BaseModel):
    """Áreas habilitadas para una Empresa (los códigos con un row de acceso)."""

    company_id: UUID
    area_codes: list[str]


class SetCompanyAccessRequest(BaseModel):
    """Reemplaza el set completo de Áreas habilitadas de la Empresa (PUT)."""

    area_codes: list[str] = Field(default_factory=list, max_length=50)


# ─────────────────────────── Bulk import (TASK 4) ───────────────────────────


class BulkImportRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fila: int
    email: str
    estado: str  # creado | actualizado | error
    motivo: str | None = None


class BulkImportResponse(BaseModel):
    total: int
    creados: int
    actualizados: int
    errores: int
    filas: list[BulkImportRowOut]
