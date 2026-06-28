"""Auth router: login, refresh, logout, me, accept-invite.

Endpoints públicos: login, refresh, accept-invite (NO existe /register).
``/me`` requiere Bearer. logout requiere el refresh token en el body.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, get_db_as_superadmin
from hg.db import get_db
from hg.modules.identity import service
from hg.modules.identity.models import Organization, User
from hg.modules.identity.schemas import (
    AcceptInviteRequest,
    InviteInfoResponse,
    LoginRequest,
    LogoutRequest,
    MeResponse,
    MeUpdateRequest,
    RefreshRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(
    body: LoginRequest,
    db: Session = Depends(get_db_as_superadmin),
) -> TokenResponse:
    user, access, refresh = service.authenticate(
        db, email=body.email, password=body.password, org_slug=body.org_slug
    )
    return TokenResponse(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    body: RefreshRequest,
    db: Session = Depends(get_db_as_superadmin),
) -> TokenResponse:
    user, access, new_refresh = service.refresh_tokens(db, refresh_token=body.refresh_token)
    return TokenResponse(
        access_token=access, refresh_token=new_refresh, user=UserOut.model_validate(user)
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    body: LogoutRequest,
    db: Session = Depends(get_db_as_superadmin),
) -> None:
    service.logout(db, refresh_token=body.refresh_token)


def _reports_count(db: Session, user_id: object) -> int:
    from sqlalchemy import func, select

    return int(
        db.scalar(select(func.count()).select_from(User).where(User.manager_id == user_id)) or 0
    )


@router.get("/me", response_model=MeResponse)
def me(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db_as_superadmin),
) -> MeResponse:
    org = db.get(Organization, user.org_id)
    return MeResponse(
        **UserOut.model_validate(user).model_dump(),
        org_name=org.name if org else "",
        reports_count=_reports_count(db, user.id),
    )


@router.patch("/me", response_model=MeResponse)
def update_me(
    body: MeUpdateRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeResponse:
    db_user = db.get(User, user.id)
    if db_user is None:  # pragma: no cover - el token garantiza que existe
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    db_user.full_name = body.full_name
    db_user.job_title = body.job_title
    db.commit()
    db.refresh(db_user)
    org = db.get(Organization, db_user.org_id)
    return MeResponse(
        **UserOut.model_validate(db_user).model_dump(),
        org_name=org.name if org else "",
        reports_count=_reports_count(db, db_user.id),
    )


@router.get("/invite-info", response_model=InviteInfoResponse)
def invite_info(
    token: str = Query(min_length=1),
    db: Session = Depends(get_db_as_superadmin),
) -> InviteInfoResponse:
    return InviteInfoResponse.model_validate(service.invitation_info(db, token=token))


@router.post("/accept-invite", response_model=TokenResponse)
def accept_invite(
    body: AcceptInviteRequest,
    db: Session = Depends(get_db_as_superadmin),
) -> TokenResponse:
    user, access, refresh = service.accept_invite(
        db, token=body.token, password=body.password, full_name=body.full_name
    )
    return TokenResponse(access_token=access, refresh_token=refresh, user=UserOut.model_validate(user))
