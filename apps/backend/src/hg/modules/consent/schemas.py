"""Schemas de consentimiento granular (Capa Empresa · TASK 5 · docx v1.0)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class ConsentStatusOut(BaseModel):
    """Preferencias de visibilidad del colaborador. ``None`` = pendiente (nunca
    decidió), ``True`` = autorizó, ``False`` = declinó/revocó."""

    consent_manager: bool | None = None
    consent_hr: bool | None = None
    updated_at: datetime | None = None


class SetConsentRequest(BaseModel):
    """Setea ambos scopes. ``"Ahora no"`` = ambos ``False``; revocar = ``False``."""

    consent_manager: bool
    consent_hr: bool
