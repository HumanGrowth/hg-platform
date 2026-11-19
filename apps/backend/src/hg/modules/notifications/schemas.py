"""Schemas de preferencias de notificación (ADR-0018)."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class NotificationPreferencesOut(BaseModel):
    """Preferencias de la persona. ``None`` = nunca decidió (hoy equivale a "permitido";
    ver ADR-0018 §8). ``leader_digest_applicable`` indica si mostrar el interruptor del
    resumen semanal (solo para quien tiene rol de manager)."""

    learning_reminders: bool | None = None
    leader_digest: bool | None = None
    leader_digest_applicable: bool = False
    updated_at: datetime | None = None


class SetNotificationPreferencesRequest(BaseModel):
    """Setea ambas preferencias a la vez (mismo patrón que ``POST /me/consent``)."""

    learning_reminders: bool
    leader_digest: bool
