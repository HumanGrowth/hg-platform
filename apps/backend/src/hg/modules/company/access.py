"""Enforcement único del ciclo de vida de la Empresa (ADR-0016 · LC-04).

``assert_company_allows`` es el ÚNICO punto que decide si un usuario puede operar
según el estado de su empresa. Se invoca desde ``get_current_user``, ``login``,
``refresh_tokens`` y (vía ``assert_company_accepts_invitations``) aceptar invitación.

Se aplica sobre el **actor** (``user.company_id``), no sobre el rol de DB: los
routers de ``company``/``admin`` corren con ``get_db_as_superadmin`` y quedan
cubiertos igual, porque el chequeo vive en ``get_current_user``.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from hg.modules.company.grace_policy import ALWAYS_ALLOWED, API_PREFIX, GRACE_ALLOW
from hg.modules.identity.models import Company, User, UserRole

READ_ONLY = "company_read_only"
SUSPENDED = "company_suspended"
TERMINATED = "company_terminated"

_MESSAGES = {
    READ_ONLY: "Tu empresa ya no tiene una licencia activa. Por ahora solo puedes ver tu progreso.",
    SUSPENDED: (
        "El acceso de tu empresa a Human Growth está pausado. Contacta a tu administrador de RRHH."
    ),
    TERMINATED: (
        "El acceso de tu empresa a Human Growth está pausado. Contacta a tu administrador de RRHH."
    ),
}


def effective_status(company: Company, now: datetime | None = None) -> str:
    """Estado efectivo: una gracia vencida cuenta como ``suspended`` (defensa en
    profundidad por si el job de LC-09 todavía no corrió)."""
    now = now or datetime.now(UTC)
    if company.status == "grace" and company.grace_ends_at is not None and now > company.grace_ends_at:
        return "suspended"
    return company.status


def _denied(code: str, company: Company) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail={
            "code": code,
            "message": _MESSAGES[code],
            "grace_ends_at": company.grace_ends_at.isoformat()
            if code == READ_ONLY and company.grace_ends_at
            else None,
        },
    )


def normalize_path(path: str) -> str:
    return path.removeprefix(API_PREFIX)


def assert_company_allows(
    request_method: str,
    request_path: str,
    user: User | Any,
    company: Company | None,
    *,
    now: datetime | None = None,
) -> None:
    """Levanta 403 con ``{code, message, grace_ends_at}`` si la empresa no permite la acción.

    ``request_path`` debe ser la **plantilla de ruta** (p. ej. ``/me/tips/{tip_id}``),
    con o sin ``/api/v1``. Una ruta no listada en la allowlist se deniega en gracia.
    """
    if user.role == UserRole.superadmin:
        return
    method = request_method.upper()
    route = (method, normalize_path(request_path))
    if route in ALWAYS_ALLOWED:
        return
    if company is None:
        # Inalcanzable (companies.id es FK NOT NULL): ante la duda, se cierra.
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": SUSPENDED, "message": _MESSAGES[SUSPENDED], "grace_ends_at": None},
        )

    st = effective_status(company, now)
    if st in ("trial", "active"):
        return
    if st == "grace":
        if route in GRACE_ALLOW:
            return
        raise _denied(READ_ONLY, company)
    if st == "terminated":
        raise _denied(TERMINATED, company)
    raise _denied(SUSPENDED, company)  # suspended (o desconocido)


def assert_company_accepts_invitations(company: Company | None, *, now: datetime | None = None) -> None:
    """Aceptar una invitación (sin sesión) solo es válido con empresa ``trial``/``active``."""
    if company is None:
        return
    st = effective_status(company, now)
    if st in ("trial", "active"):
        return
    if st == "grace":
        raise _denied(READ_ONLY, company)
    raise _denied(TERMINATED if st == "terminated" else SUSPENDED, company)
