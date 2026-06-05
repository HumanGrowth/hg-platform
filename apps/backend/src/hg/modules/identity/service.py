"""Identity business logic: auth flows + org/invitation management.

Los endpoints son delgados y delegan acá. Las funciones reciben una
``Session`` ya configurada por la dependency (rol/contexto correctos) y
levantan ``HTTPException`` para los errores de dominio.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from hg.config import get_settings
from hg.core.security import (
    create_token,
    decode_token,
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    verify_password,
)
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Organization, User, UserRole, UserSession

logger = logging.getLogger("hg.identity")
settings = get_settings()

INVITE_TTL_DAYS = 7
_INVALID_CREDENTIALS = "invalid credentials"


def _now() -> datetime:
    return datetime.now(UTC)


def _issue_session(db: Session, user: User) -> tuple[str, str]:
    """Crea access+refresh y persiste la session (refresh hasheado)."""
    access = create_token(
        user_id=user.id, org_id=user.org_id, role=user.role.value, token_type="access"
    )
    refresh = create_token(
        user_id=user.id, org_id=user.org_id, role=user.role.value, token_type="refresh"
    )
    session = UserSession(
        user_id=user.id,
        org_id=user.org_id,
        refresh_token_hash=hash_opaque_token(refresh),
        expires_at=_now() + timedelta(days=settings.jwt_refresh_ttl_days),
        device_info={},
    )
    db.add(session)
    db.flush()
    return access, refresh


# ─────────────────────────── Auth ───────────────────────────


def authenticate(
    db: Session, *, email: str, password: str, org_slug: str | None
) -> tuple[User, str, str]:
    stmt = select(User).join(Organization, User.org_id == Organization.id).where(
        User.email == email
    )
    if org_slug:
        stmt = stmt.where(Organization.slug == org_slug)
    users = db.execute(stmt).scalars().all()

    if len(users) > 1:
        # Email presente en varias orgs y sin org_slug para desambiguar.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="email exists in multiple organizations; org_slug required",
        )
    user = users[0] if users else None

    # Mensaje genérico: no revelar si el email existe.
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=_INVALID_CREDENTIALS
        )

    user.last_login_at = _now()
    access, refresh = _issue_session(db, user)
    return user, access, refresh


def refresh_tokens(db: Session, *, refresh_token: str) -> tuple[User, str, str]:
    try:
        decode_token(refresh_token, expected_type="refresh")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid refresh token"
        ) from e

    token_hash = hash_opaque_token(refresh_token)
    session = db.execute(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    ).scalar_one_or_none()

    if session is None or session.revoked_at is not None or session.expires_at <= _now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="refresh token revoked or expired"
        )

    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found or inactive"
        )

    # Rotación: revoca la vieja, emite una nueva.
    session.revoked_at = _now()
    access, refresh = _issue_session(db, user)
    return user, access, refresh


def logout(db: Session, *, refresh_token: str) -> None:
    """Revoca la session del refresh token. Idempotente (no error si no existe)."""
    token_hash = hash_opaque_token(refresh_token)
    session = db.execute(
        select(UserSession).where(UserSession.refresh_token_hash == token_hash)
    ).scalar_one_or_none()
    if session is not None and session.revoked_at is None:
        session.revoked_at = _now()


def accept_invite(
    db: Session, *, token: str, password: str, full_name: str
) -> tuple[User, str, str]:
    token_hash = hash_opaque_token(token)
    invitation = db.execute(
        select(Invitation).where(Invitation.token_hash == token_hash)
    ).scalar_one_or_none()

    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invitation not found")
    if invitation.revoked_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="invitation revoked")
    if invitation.accepted_at is not None:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="invitation already used")
    if invitation.expires_at <= _now():
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="invitation expired")

    org = db.get(Organization, invitation.org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="organization not found")
    if org.licenses_used >= org.licenses_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="no licenses available"
        )

    user = User(
        org_id=org.id,
        email=invitation.email,
        hashed_password=hash_password(password),
        full_name=full_name,
        role=invitation.role,
        last_login_at=_now(),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="user already exists in organization"
        ) from e

    org.licenses_used += 1
    invitation.accepted_at = _now()
    invitation.accepted_user_id = user.id

    access, refresh = _issue_session(db, user)
    return user, access, refresh


# ─────────────────────────── Admin: orgs ───────────────────────────


def create_org(db: Session, *, data: dict) -> Organization:
    org = Organization(**data)
    db.add(org)
    try:
        db.flush()
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="organization slug already exists"
        ) from e
    return org


def list_orgs(db: Session, *, limit: int, offset: int) -> tuple[list[Organization], int]:
    total = db.execute(select(func.count()).select_from(Organization)).scalar_one()
    items = (
        db.execute(
            select(Organization).order_by(Organization.created_at.desc()).limit(limit).offset(offset)
        )
        .scalars()
        .all()
    )
    return list(items), total


# ─────────────────────────── Admin: invitations ───────────────────────────


def create_invitation(
    db: Session, *, org_id: UUID, email: str, role: UserRole, invited_by: User
) -> tuple[Invitation, str]:
    org = db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="organization not found")

    # RBAC fino: un admin (no superadmin) sólo puede invitar a su propia org.
    if invited_by.role is not UserRole.superadmin and invited_by.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="cannot invite to another organization"
        )
    if org.licenses_used >= org.licenses_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="no licenses available"
        )

    plain, token_hash = generate_opaque_token()
    invitation = Invitation(
        org_id=org_id,
        email=email,
        role=role,
        token_hash=token_hash,
        invited_by_user_id=invited_by.id,
        expires_at=_now() + timedelta(days=INVITE_TTL_DAYS),
    )
    db.add(invitation)
    db.flush()

    invite_url = f"{settings.app_base_url}/accept-invite?token={plain}"
    # Email stub: en MVP sólo se loggea (envío real en B3-05).
    logger.info("invitation_email_stub", extra={"to": email, "url": invite_url})
    return invitation, plain


def revoke_invitation(db: Session, *, invitation_id: UUID, actor: User) -> None:
    invitation = db.get(Invitation, invitation_id)
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invitation not found")
    if actor.role is not UserRole.superadmin and actor.org_id != invitation.org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="cannot revoke another org's invitation"
        )
    if invitation.revoked_at is None:
        invitation.revoked_at = _now()


def list_invitations(
    db: Session, *, org_id: UUID, status_filter: str | None
) -> list[Invitation]:
    stmt = select(Invitation).where(Invitation.org_id == org_id)
    now = _now()
    if status_filter == "pending":
        stmt = stmt.where(
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
            Invitation.expires_at > now,
        )
    elif status_filter == "accepted":
        stmt = stmt.where(Invitation.accepted_at.is_not(None))
    elif status_filter == "expired":
        stmt = stmt.where(
            Invitation.accepted_at.is_(None),
            Invitation.expires_at <= now,
        )
    return list(db.execute(stmt.order_by(Invitation.created_at.desc())).scalars().all())
