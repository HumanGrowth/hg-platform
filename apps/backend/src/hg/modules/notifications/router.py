"""Preferencias de notificación de la persona (ADR-0018).

``/me/notification-preferences`` corre bajo ``get_current_user`` (rol hg_app, RLS por org).
La pantalla vive en el Perfil, junto al consentimiento de privacidad.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User, UserRole
from hg.modules.notifications import service
from hg.modules.notifications.models import NotificationPreference
from hg.modules.notifications.schemas import (
    NotificationPreferencesOut,
    SetNotificationPreferencesRequest,
)

router = APIRouter()


def _out(pref: NotificationPreference | None, user: User) -> NotificationPreferencesOut:
    applicable = user.role == UserRole.manager
    if pref is None:
        return NotificationPreferencesOut(leader_digest_applicable=applicable)
    return NotificationPreferencesOut(
        learning_reminders=pref.learning_reminders,
        leader_digest=pref.leader_digest,
        leader_digest_applicable=applicable,
        updated_at=pref.updated_at,
    )


@router.get("/notification-preferences", response_model=NotificationPreferencesOut)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesOut:
    return _out(service.get_preferences(db, current_user.id), current_user)


@router.put("/notification-preferences", response_model=NotificationPreferencesOut)
def set_notification_preferences(
    body: SetNotificationPreferencesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesOut:
    """Setea ambas preferencias. Idempotente; cada cambio queda en el log de auditoría."""
    pref = service.set_preferences(
        db,
        user=current_user,
        learning_reminders=body.learning_reminders,
        leader_digest=body.leader_digest,
    )
    return _out(pref, current_user)
