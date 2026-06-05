"""Auth router: login, refresh, logout, me, accept-invite.

Endpoints públicos: login, refresh, accept-invite (NO existe /register).
``/me`` requiere Bearer. logout requiere el refresh token en el body.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, get_db_as_superadmin
from hg.modules.identity import service
from hg.modules.identity.models import User
from hg.modules.identity.schemas import (
    AcceptInviteRequest,
    InviteInfoResponse,
    LoginRequest,
    LogoutRequest,
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


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


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
