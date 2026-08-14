"""Schemas de consentimiento (Capa Empresa · TASK 5)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ConsentStatusOut(BaseModel):
    """Estado del consentimiento del user actual frente a la versión vigente."""

    current_version: str
    accepted: bool
    accepted_at: datetime | None = None
