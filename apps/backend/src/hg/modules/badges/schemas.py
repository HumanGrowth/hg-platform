"""Schemas de badges."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class MyBadgeOut(BaseModel):
    """Badge del catálogo + estado de desbloqueo del usuario."""

    code: str
    name: str
    description: str
    icon_url: str
    unlock_hint: str
    unlocked: bool
    unlocked_at: datetime | None
