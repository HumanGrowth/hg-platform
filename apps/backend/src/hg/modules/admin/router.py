"""Admin router: org provisioning + invitations (DEV-07).

Todo bajo ``hg_superadmin`` (BYPASSRLS, cross-tenant): la autorización la
imponen ``require_role`` + chequeos de org en el service. ``POST /orgs`` y
``GET /orgs`` son sólo superadmin; invitar/revocar/listar invitaciones lo
puede hacer el superadmin o un admin de la propia org.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.identity import service
from hg.modules.identity.models import User
from hg.modules.identity.schemas import (
    CreateOrgRequest,
    InvitationOut,
    InviteRequest,
    InviteResponse,
    OrgListResponse,
    OrgOut,
)

router = APIRouter()


@router.post("/orgs", response_model=OrgOut, status_code=status.HTTP_201_CREATED)
def create_org(
    body: CreateOrgRequest,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> OrgOut:
    org = service.create_org(db, data=body.model_dump(exclude_none=True))
    return OrgOut.model_validate(org)


@router.get("/orgs", response_model=OrgListResponse)
def list_orgs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> OrgListResponse:
    items, total = service.list_orgs(db, limit=limit, offset=offset)
    return OrgListResponse(
        items=[OrgOut.model_validate(o) for o in items], total=total, limit=limit, offset=offset
    )


@router.post("/orgs/{org_id}/invite", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def invite(
    org_id: UUID,
    body: InviteRequest,
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("superadmin", "admin")),
) -> InviteResponse:
    invitation, plain = service.create_invitation(
        db, org_id=org_id, email=body.email, role=body.role, invited_by=actor
    )
    invite_url = f"{service.settings.app_base_url}/accept-invite?token={plain}"
    return InviteResponse(
        invitation_id=invitation.id,
        email=invitation.email,
        role=invitation.role,
        invite_token=plain,
        invite_url=invite_url,
        expires_at=invitation.expires_at,
    )


@router.get("/orgs/{org_id}/invitations", response_model=list[InvitationOut])
def list_invitations(
    org_id: UUID,
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("superadmin", "admin")),
) -> list[InvitationOut]:
    if actor.role.value != "superadmin" and actor.org_id != org_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="forbidden")
    items = service.list_invitations(db, org_id=org_id, status_filter=status_filter)
    return [InvitationOut.model_validate(i) for i in items]


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_invitation(
    invitation_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role("superadmin", "admin")),
) -> None:
    service.revoke_invitation(db, invitation_id=invitation_id, actor=actor)
