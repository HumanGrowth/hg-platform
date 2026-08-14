"""Routers de la Capa Empresa (TASK 2).

@security: TODOS estos endpoints corren bajo ``hg_superadmin`` (BYPASSRLS). La
frontera de Empresa NO la impone RLS sino un **filtro de app duro por
``company_id``** en cada handler (vía ``resolve_company_id`` + los ``_require_*``
del service). Es el MVP acordado (ver plan Capa Empresa · regla dura #5); el
endurecimiento con GUC ``app.current_company_id`` queda para una fase posterior.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.company import bulk_service, service
from hg.modules.company.bulk_service import BulkImportError
from hg.modules.company.schemas import (
    BulkImportResponse,
    BulkImportRowOut,
    CompanyInviteRequest,
    CompanyInviteResponse,
    CompanyMemberOut,
    CompanyOrgOut,
    CompanyOut,
    CreateCompanyOrgRequest,
    CreateCompanyRequest,
    UpdateMemberRequest,
)
from hg.modules.identity import service as identity_service
from hg.modules.identity.models import User
from hg.modules.identity.schemas import UserOut

_MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB

# /company/* — RRHH (company_admin) + superadmin.
company_router = APIRouter()
# /admin/companies — solo superadmin HG.
admin_router = APIRouter()


# ─────────────────────────── Superadmin: /admin/companies ───────────────────────────


@admin_router.get("/companies", response_model=list[CompanyOut])
def list_companies(
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> list[CompanyOut]:
    return service.list_companies(db)


@admin_router.post("/companies", response_model=CompanyOut, status_code=status.HTTP_201_CREATED)
def create_company(
    body: CreateCompanyRequest,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> CompanyOut:
    return service.create_company(db, data=body)


# ─────────────────────────── company_admin: /company/* ───────────────────────────


@company_router.get("/organizations", response_model=list[CompanyOrgOut])
def list_organizations(
    company_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("company_admin", "superadmin")),
) -> list[CompanyOrgOut]:
    return service.list_company_orgs(db, service.resolve_company_id(actor, company_id))


@company_router.post(
    "/organizations", response_model=CompanyOrgOut, status_code=status.HTTP_201_CREATED
)
def create_organization(
    body: CreateCompanyOrgRequest,
    company_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("company_admin", "superadmin")),
) -> CompanyOrgOut:
    return service.create_org_in_company(
        db, company_id=service.resolve_company_id(actor, company_id), data=body
    )


@company_router.get("/members", response_model=list[CompanyMemberOut])
def list_members(
    company_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("company_admin", "superadmin")),
) -> list[CompanyMemberOut]:
    return service.list_company_members(db, service.resolve_company_id(actor, company_id))


@company_router.post(
    "/organizations/{org_id}/invite",
    response_model=CompanyInviteResponse,
    status_code=status.HTTP_201_CREATED,
)
def invite_member(
    org_id: UUID,
    body: CompanyInviteRequest,
    company_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("company_admin", "superadmin")),
) -> CompanyInviteResponse:
    invitation, plain = service.invite_to_company_org(
        db,
        company_id=service.resolve_company_id(actor, company_id),
        org_id=org_id, email=body.email, role=body.role, invited_by=actor, name=body.name,
    )
    invite_url = f"{identity_service.settings.app_base_url}/accept-invite?token={plain}"
    return CompanyInviteResponse(
        invitation_id=invitation.id, email=invitation.email, role=invitation.role,
        invite_url=invite_url, expires_at=invitation.expires_at,
    )


@company_router.patch("/members/{user_id}", response_model=UserOut)
def update_member(
    user_id: UUID,
    body: UpdateMemberRequest,
    company_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("company_admin", "superadmin")),
) -> UserOut:
    member = service.update_company_member(
        db, company_id=service.resolve_company_id(actor, company_id),
        user_id=user_id, payload=body,
    )
    return UserOut.model_validate(member)


# ─────────────────────────── Bulk import (TASK 4) ───────────────────────────


@company_router.get("/members/bulk-import/template")
def bulk_import_template(
    _: User = Depends(require_role("company_admin", "superadmin")),
) -> Response:
    """Descarga el `.xlsx` de plantilla (headers + fila de ejemplo)."""
    content = bulk_service.build_template_xlsx()
    return Response(
        content=content,
        media_type=bulk_service.XLSX_MIME,
        headers={"Content-Disposition": 'attachment; filename="plantilla_miembros.xlsx"'},
    )


@company_router.post("/members/bulk-import", response_model=BulkImportResponse)
async def bulk_import_members(
    file: UploadFile = File(...),
    company_id: UUID | None = Query(None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("company_admin", "superadmin")),
) -> BulkImportResponse:
    """Alta/actualización masiva de miembros desde un `.xlsx`. Idempotente por
    email; devuelve un reporte fila por fila (nunca falla todo por una fila mala)."""
    content = await file.read()
    if len(content) > _MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="el archivo excede el tamaño máximo (5 MB)",
        )
    try:
        rows = bulk_service.bulk_import(
            db, company_id=service.resolve_company_id(actor, company_id),
            actor=actor, content=content,
        )
    except BulkImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    filas = [BulkImportRowOut.model_validate(r) for r in rows]
    return BulkImportResponse(
        total=len(filas),
        creados=sum(1 for r in filas if r.estado == "creado"),
        actualizados=sum(1 for r in filas if r.estado == "actualizado"),
        errores=sum(1 for r in filas if r.estado == "error"),
        filas=filas,
    )
