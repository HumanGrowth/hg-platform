"""FastAPI dependencies shared across modules."""
from __future__ import annotations

from uuid import UUID

from fastapi import Header, HTTPException, status


def require_org_id(x_org_id: str | None = Header(default=None)) -> UUID:
    """Provisional: lee X-Org-Id del header. Mañana viene del JWT."""
    if not x_org_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="X-Org-Id required")
    try:
        return UUID(x_org_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid org id"
        ) from None
