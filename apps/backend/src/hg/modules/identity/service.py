"""Identity business logic: auth flows + org/invitation management.

Los endpoints son delgados y delegan acá. Las funciones reciben una
``Session`` ya configurada por la dependency (rol/contexto correctos) y
levantan ``HTTPException`` para los errores de dominio.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
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
from hg.modules.identity.models import (
    Company,
    Organization,
    OrgTier,
    User,
    UserRole,
    UserSession,
)
from hg.modules.notifications.email_service import email_service

logger = logging.getLogger("hg.identity")
settings = get_settings()


def _display_name_from_email(email: str) -> str:
    """Nombre legible aproximado desde el email (el invitado aún no tiene nombre)."""
    local = email.split("@", 1)[0]
    return local.split(".")[0].replace("_", " ").title() or "hola"

INVITE_TTL_DAYS = 7
_INVALID_CREDENTIALS = "invalid credentials"


def _now() -> datetime:
    return datetime.now(UTC)


def company_active_users(db: Session, company_id: UUID) -> int:
    """Uso del pool de la Empresa = users activos de todas sus orgs (Capa Empresa
    · TASK 3). Punto único de verdad — el uso no se almacena, se computa."""
    return int(
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.company_id == company_id, User.is_active.is_(True))
        )
        or 0
    )


def check_license_available(db: Session, org: Organization) -> None:
    """Valida, antes de sumar un user activo a ``org``, el **pool de la Empresa**
    (CE-06: el límite es solo el pool de la Empresa; el cap por-org se eliminó).
    El uso se computa por users activos, no hay contador que mantener."""
    company = db.get(Company, org.company_id)
    if company is not None and company_active_users(db, company.id) >= company.licenses_total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="company license pool exhausted",
        )


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


def invitation_info(db: Session, *, token: str) -> dict:
    """Vista read-only de una invitación por token (no la consume)."""
    invitation = db.execute(
        select(Invitation).where(Invitation.token_hash == hash_opaque_token(token))
    ).scalar_one_or_none()
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="invitation not found")

    org = db.get(Organization, invitation.org_id)
    if invitation.revoked_at is not None:
        status_str = "revoked"
    elif invitation.accepted_at is not None:
        status_str = "accepted"
    elif invitation.expires_at <= _now():
        status_str = "expired"
    else:
        status_str = "pending"

    return {
        "email": invitation.email,
        "role": invitation.role,
        "org_name": org.name if org else "",
        "status": status_str,
    }


def accept_invite(
    db: Session,
    *,
    token: str,
    password: str,
    username_or_email: str | None = None,
    full_name: str | None = None,
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
    check_license_available(db, org)

    # Release TASK 3.4: el form pide "usuario o correo" único. Si es email, debe
    # coincidir con el invitado; si es username, se guarda como username (único
    # por org) + full_name fallback. `full_name` viejo sigue aceptándose.
    value = (username_or_email or full_name or "").strip()
    if not value:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="identificador requerido"
        )
    if "@" in value:
        if value.lower() != invitation.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="el correo debe coincidir con el de la invitación",
            )
        username: str | None = None
        display_name = _display_name_from_email(value)
    else:
        username = value
        display_name = value

    user = User(
        org_id=org.id,
        company_id=org.company_id,  # denormalizado (Capa Empresa · CE-01)
        email=invitation.email,
        hashed_password=hash_password(password),
        full_name=display_name,
        username=username,
        role=invitation.role,
        last_login_at=_now(),
    )
    db.add(user)
    try:
        db.flush()
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ese usuario o correo ya existe en la organización",
        ) from e

    # CE-06: el uso del pool se computa (users activos), no hay contador que sumar.
    invitation.accepted_at = _now()
    invitation.accepted_user_id = user.id

    access, refresh = _issue_session(db, user)

    # Email de bienvenida (no rompe el registro si falla). El CTA apunta a
    # /modulos por ahora; pasará a /modulos/intro cuando exista (Release TASK 6).
    email_service.send(
        to=user.email,
        subject="¡Bienvenida a HumanGrowth!",
        template="welcome",
        context={
            "nombre": (user.full_name or "").split(" ")[0] or "hola",
            "cta_url": f"{settings.app_base_url}/modulos",
        },
    )
    return user, access, refresh


# ─────────────────────────── Admin: orgs ───────────────────────────


def create_org(db: Session, *, data: dict) -> Organization:
    # Capa Empresa (CE-01): toda org vive bajo una Company. El endpoint admin
    # existente crea una Company envoltura 1:1 — el ``licenses_total`` pasado se
    # usa como pool de la Company y el cap de la org queda en NULL (consume del
    # pool). TASK 2 agregará crear una org bajo una Company existente.
    # El billing/contrato/tier y el pool van a la Company (CE-06); la Organization
    # solo lleva sus campos operativos (name, slug, country).
    company = Company(
        name=data["name"],
        slug=f"c-{uuid4().hex[:10]}",
        tier=data.get("tier", OrgTier.C),
        billing_status=data.get("billing_status", "trial"),
        billing_cycle=data.get("billing_cycle"),
        contract_start=data.get("contract_start"),
        contract_end=data.get("contract_end"),
        licenses_total=data.get("licenses_total", 0) or 0,
    )
    db.add(company)
    db.flush()
    org = Organization(
        company_id=company.id,
        name=data["name"],
        slug=data["slug"],
        country=data.get("country"),
        logo_url=data.get("logo_url"),
        primary_color=data.get("primary_color"),
    )
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
    db: Session,
    *,
    org_id: UUID,
    email: str,
    role: UserRole,
    invited_by: User,
    name: str | None = None,
) -> tuple[Invitation, str]:
    org = db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="organization not found")

    # RBAC fino: un admin (no superadmin) sólo puede invitar a su propia org.
    if invited_by.role is not UserRole.superadmin and invited_by.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="cannot invite to another organization"
        )
    check_license_available(db, org)

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
    # Email real de invitación (template oficial formal, sin beta). Nunca rompe el
    # flujo: email_service.send loguea y devuelve status, no levanta.
    email_service.send(
        to=email,
        subject="Tu acceso a HumanGrowth ya está listo",
        template="invitation",
        context={
            "nombre": (name or "").strip() or _display_name_from_email(email),
            "link": invite_url,
        },
    )
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


# ─────────────────────────── Admin: users ───────────────────────────


def _assert_same_org_or_superadmin(actor: User, org_id: UUID) -> None:
    if actor.role is not UserRole.superadmin and actor.org_id != org_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="cannot access another organization"
        )


def list_org_users(
    db: Session,
    *,
    org_id: UUID,
    actor: User,
    status_filter: str,
    role: UserRole | None,
    page: int,
    page_size: int,
) -> tuple[list[User], int]:
    _assert_same_org_or_superadmin(actor, org_id)

    filters = [User.org_id == org_id]
    if status_filter == "active":
        filters.append(User.is_active.is_(True))
    elif status_filter == "inactive":
        filters.append(User.is_active.is_(False))
    if role is not None:
        filters.append(User.role == role)

    total = db.execute(select(func.count()).select_from(User).where(*filters)).scalar_one()
    items = (
        db.execute(
            select(User)
            .where(*filters)
            .order_by(User.created_at.desc())
            .limit(page_size)
            .offset((page - 1) * page_size)
        )
        .scalars()
        .all()
    )
    return list(items), total


def update_user(db: Session, *, user_id: UUID, actor: User, payload: dict) -> User:
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    _assert_same_org_or_superadmin(actor, target.org_id)

    new_role: UserRole | None = payload.get("role")
    new_active: bool | None = payload.get("is_active")
    new_manager: UUID | None = payload.get("manager_id")

    # No podés cambiar tu propio rol.
    if new_role is not None and target.id == actor.id and new_role != target.role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="cannot change your own role"
        )

    # No desactivar / degradar al último superadmin activo.
    losing_superadmin = target.role is UserRole.superadmin and (
        new_active is False or (new_role is not None and new_role is not UserRole.superadmin)
    )
    if losing_superadmin:
        others = db.execute(
            select(func.count())
            .select_from(User)
            .where(
                User.role == UserRole.superadmin,
                User.is_active.is_(True),
                User.id != target.id,
            )
        ).scalar_one()
        if others == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="cannot remove the last superadmin"
            )

    # manager_id debe pertenecer a la misma org.
    if new_manager is not None:
        manager = db.get(User, new_manager)
        if manager is None or manager.org_id != target.org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="manager must belong to the same organization",
            )
        target.manager_id = new_manager

    # Reactivar consume del pool de la Empresa → validar antes (CE-06: sin contador
    # por-org; el uso se computa por users activos).
    if new_active is not None and new_active != target.is_active:
        if new_active is True:
            org = db.get(Organization, target.org_id)
            if org is not None:
                check_license_available(db, org)
        target.is_active = new_active

    if new_role is not None:
        target.role = new_role
    if "career_level" in payload and payload["career_level"] is not None:
        target.career_level = payload["career_level"]

    db.flush()
    return target


def hard_delete_user(db: Session, *, user_id: UUID, actor: User) -> None:
    """Borrado DEFINITIVO de un usuario (solo superadmin, cross-tenant).

    Todas las FKs a ``users.id`` ya declaran ``ondelete`` (``CASCADE`` para los
    datos propios del usuario — sesiones, attempts, progreso, assessment,
    consent, badges, ai — y ``SET NULL`` para las referencias — ``manager_id``
    self-ref, ``invited_by``, ``created_by``…). Por eso un ``DELETE`` de la fila
    dispara la limpieza en cascada a nivel DB: no quedan filas huérfanas y no
    hace falta migración. Se ejecuta con un DELETE de Core (no ORM) para
    apoyarse en el ``ondelete`` de la base.

    Reglas de seguridad: no auto-borrado; no borrar el último superadmin activo.
    """
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if target.id == actor.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="cannot delete yourself"
        )
    if target.role is UserRole.superadmin:
        others = db.execute(
            select(func.count())
            .select_from(User)
            .where(
                User.role == UserRole.superadmin,
                User.is_active.is_(True),
                User.id != target.id,
            )
        ).scalar_one()
        if others == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="cannot delete the last superadmin",
            )

    # Audit: el borrado es irreversible y cross-tenant.
    logger.warning(
        "hard_delete_user actor=%s target=%s email=%s org=%s role=%s",
        actor.id, target.id, target.email, target.org_id, target.role.value,
    )
    # DELETE de Core → dispara ondelete (CASCADE / SET NULL) de las 26 FKs.
    db.execute(delete(User).where(User.id == user_id))
    db.flush()
