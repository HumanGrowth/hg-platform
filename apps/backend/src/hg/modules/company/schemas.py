"""Pydantic v2 schemas para la Capa Empresa (TASK 2)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
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
    is_active: bool  # DEPRECADO (ADR-0016): usar `status`
    created_at: datetime
    # Ciclo de vida (ADR-0016)
    status: str
    status_changed_at: datetime
    grace_ends_at: datetime | None = None
    grace_days: int = 30


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


class UpdateOrgRequest(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class UpdateCompanyLicensesRequest(BaseModel):
    licenses_total: int = Field(ge=0)


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
    # Pre-provisioning: cuenta ya configurada, sin aceptar. `invite_status`:
    # staged (sin correo enviado) | sent | expired; None si no es invitado.
    is_invited: bool = False
    invite_status: str | None = None
    last_active_at: datetime | None
    modules_completed: int
    modules_in_progress: int
    # Ratio del roster: units asignadas (sueltas + ruta) y cuántas de ellas completó.
    modules_assigned: int
    modules_assigned_completed: int
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


class PillarAccessOut(BaseModel):
    """Un PILAR (sub-categoría dentro de una dimensión) y si está habilitado."""

    code: str
    name: str
    enabled: bool


class DimensionAccessOut(BaseModel):
    """Una dimensión (CP, PR, …), si está habilitada, y los pilares de su catálogo."""

    code: str
    enabled: bool
    pillars: list[PillarAccessOut]


class CompanyAccessOut(BaseModel):
    """Acceso de contenido de una Empresa: Áreas, dimensiones y pilares."""

    company_id: UUID
    area_codes: list[str]
    dimension_codes: list[str]  # dimensiones habilitadas
    disabled_pillars: list[str]  # "<DIM>:<PILAR>" deshabilitados
    dimensions: list[DimensionAccessOut]


class SetCompanyAccessRequest(BaseModel):
    """Reemplaza el set completo de Áreas habilitadas de la Empresa (PUT).
    ``dimension_codes`` / ``disabled_pillars`` en None = no tocarlos."""

    area_codes: list[str] = Field(default_factory=list, max_length=50)
    dimension_codes: list[str] | None = Field(default=None, max_length=6)
    disabled_pillars: list[str] | None = Field(default=None, max_length=200)


# ─────────────────────────── Bulk import (TASK 4) ───────────────────────────


class BulkImportRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fila: int
    email: str
    estado: str  # creado | actualizado | error
    motivo: str | None = None
    # Fila aplicada con un problema secundario (p.ej. no se pudo enlazar el manager).
    aviso: str | None = None


class BulkImportOrgRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fila: int
    organizacion: str
    estado: str  # creada | actualizada | sin_cambios | error
    motivo: str | None = None


class BulkImportModuleRowOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    fila: int
    organizacion: str
    modulo: str
    estado: str  # asignado | sin_cambios | error
    motivo: str | None = None


class LicenseUsageOut(BaseModel):
    active: int
    invited: int
    to_invite: int
    pool: int
    overage: int


class BulkImportResponse(BaseModel):
    # Resumen de la hoja de miembros (contrato original del importador).
    total: int
    creados: int
    actualizados: int
    errores: int
    filas: list[BulkImportRowOut]
    # Hojas nuevas + advertencias + modo.
    organizaciones: list[BulkImportOrgRowOut] = []
    modulos: list[BulkImportModuleRowOut] = []
    advertencias: list[str] = []
    solo_validar: bool = False
    invitaciones_enviadas: int = 0
    # Uso proyectado de licencias (LC-06). Solo informa; el envío lo frena el 409.
    licencias: LicenseUsageOut | None = None


class SendInvitationsRequest(BaseModel):
    # Sin filtros: todos los invitados sin correo enviado (y los de invitación vencida).
    org_id: UUID | None = None
    user_ids: list[UUID] | None = None
    include_expired: bool = True
    # LC-06: reconocer explícitamente que el envío supera las licencias de la empresa.
    acknowledge_overage: bool = False


class SendInvitationsResponse(BaseModel):
    enviadas: int
    omitidas: int
    pendientes: int  # invitados que no entraron en esta llamada (tope por llamada)
    errores: dict[str, str]  # correo → motivo


# ─────────────────────────── Superadmin: ciclo de vida (ADR-0016) ───────────────────────────


class CompanyStatusChangeRequest(BaseModel):
    to_status: Literal["trial", "active", "grace", "suspended", "terminated"]
    reason: str | None = Field(default=None, max_length=2000)
    dry_run: bool = False
    # Confirmación tipo "escribí el nombre": obligatoria para suspended/terminated
    # (salvo dry_run). Debe coincidir con el slug de la empresa.
    confirm_slug: str | None = Field(default=None, max_length=100)


class LifecyclePreviewOut(BaseModel):
    company_id: UUID
    from_status: str
    to_status: str
    active_users_by_role: dict[str, int]
    active_users_total: int
    pending_invitations: int
    admins: int
    grace_ends_at: datetime | None = None


class CompanyStatusChangeOut(BaseModel):
    applied: bool  # False = dry_run
    preview: LifecyclePreviewOut
    company: CompanyOut


class CompanyLifecycleEventOut(BaseModel):
    id: UUID
    event_type: str
    from_status: str | None = None
    to_status: str | None = None
    actor_user_id: UUID | None = None
    actor_name: str | None = None
    reason: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class CompanyLifecycleEventsPage(BaseModel):
    items: list[CompanyLifecycleEventOut]
    total: int
