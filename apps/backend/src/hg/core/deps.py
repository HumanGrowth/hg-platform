"""FastAPI dependencies shared across modules.

Las dependencies de auth/tenancy viven en ``hg.core.auth_middleware``; se
re-exportan acá para mantener un único punto de import (``hg.core.deps``).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException, status

from hg.core.auth_middleware import (
    get_current_user,
    get_db_as_superadmin,
    require_role,
)

__all__ = [
    "get_current_user",
    "get_db_as_superadmin",
    "require_org_id",
    "require_role",
]


def require_org_id(x_org_id: str | None = Header(default=None)) -> UUID:
    """Provisional/legacy: lee X-Org-Id del header. El flujo real usa el JWT
    vía ``get_current_user``. Se conserva para utilidades/integraciones."""
    if not x_org_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="X-Org-Id required")
    try:
        return UUID(x_org_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid org id"
        ) from None
