"""Bearer auth + tenancy context per request, RBAC, and DB role helpers.

Modelo de roles de DB (ver ADR-0001):
  - Pedidos autenticados tenant-scoped corren bajo ``hg_app`` (RLS activo) +
    ``app.current_org_id`` fijado desde el JWT.
  - Flujos sin sesión o cross-tenant (login, refresh, logout, accept-invite,
    admin) corren bajo ``hg_superadmin`` (BYPASSRLS), con la autorización
    garantizada por RBAC (``require_role``) + chequeos de org explícitos.

El rol por defecto de conexión (``hg``) es superusuario y bypassa RLS; por eso
elevamos/bajamos privilegios por transacción con ``SET LOCAL ROLE`` en lugar de
depender del rol de conexión.
"""
from __future__ import annotations

from collections.abc import Generator
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import text
from sqlalchemy.orm import Session

from hg.core.security import decode_token
from hg.core.tenancy import set_org_context
from hg.db import SessionLocal, get_db
from hg.modules.identity.models import User

bearer = HTTPBearer(auto_error=True)


def get_db_as_superadmin() -> Generator[Session, None, None]:
    """Sesión transaccional que opera como ``hg_superadmin`` (BYPASSRLS).

    Para endpoints sin contexto de tenant todavía (login/refresh/accept-invite)
    o cross-tenant (admin). La autorización la imponen RBAC + checks de org,
    no RLS.
    """
    db = SessionLocal()
    try:
        db.begin()
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    """Valida el access token, fija el contexto de tenant y carga el usuario.

    Baja a ``hg_app`` (RLS activo) y fija ``app.current_org_id`` ANTES del
    primer SELECT, de modo que la carga del usuario ya respeta el aislamiento.
    """
    try:
        payload = decode_token(creds.credentials, expected_type="access")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token"
        ) from e

    try:
        org_id = UUID(payload["org_id"])
        user_id = UUID(payload["sub"])
    except (KeyError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="malformed token"
        ) from e

    # 1. Activar RLS para esta transacción + fijar el tenant ANTES de consultar.
    db.execute(text("SET LOCAL ROLE hg_app"))
    set_org_context(db, org_id)

    # 2. Ahora el SELECT respeta RLS (sólo ve usuarios del tenant del token).
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="user not found or inactive"
        )

    # 3. last_active_at best-effort, no bloqueante (ver hg.modules.identity.tasks).
    _touch_last_active(user_id, org_id)
    return user


def _touch_last_active(user_id: UUID, org_id: UUID) -> None:
    """Despacha la actualización de last_active_at a Celery, best-effort.

    Si el broker no está disponible (p.ej. en tests desde el host) se ignora:
    nunca debe bloquear ni romper el request autenticado.
    """
    try:
        from hg.modules.identity.tasks import update_last_active

        update_last_active.delay(str(user_id), str(org_id))
    except Exception:
        # Best-effort: si el broker no está disponible, no romper el request.
        pass


def require_role(*allowed_roles: str):
    """Factory: dependency que valida que ``current_user.role`` esté permitido."""

    def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role"
            )
        return user

    return _checker
