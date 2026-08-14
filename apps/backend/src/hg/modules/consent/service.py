"""Lógica de consentimiento + auditoría (Capa Empresa · TASK 5).

- ``record_consent`` / ``has_active_consent`` / ``consented_user_ids``: el gate de
  privacidad — RRHH/manager solo ven el `state` individual de quien aceptó la
  versión **vigente** del consentimiento.
- ``log_access``: escribe en ``data_access_log`` (append-only) cada consulta de
  RRHH/manager al estado o detalle de un colaborador.
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.consent.models import (
    ConsentChangeLog,
    DataAccessLog,
    UserConsent,
    UserPrivacyConsent,
)
from hg.modules.identity.models import User

# Estados del colaborador en el dashboard RRHH/manager (docx §6.2) — reemplazan
# el "sin datos" genérico.
STATUS_PENDING = "pending"  # None: nunca vio la pantalla / onboarding a medias
STATUS_DECLINED = "declined"  # False: eligió "Ahora no" o revocó
STATUS_AUTHORIZED_NO_ACTIVITY = "authorized_no_activity"  # True pero sin progreso
STATUS_DATA_AVAILABLE = "data_available"  # True + tiene progreso

# Versión vigente del consentimiento. Al cambiar el texto legal, subir esta
# constante → los consentimientos viejos dejan de contar y se re-pide aceptar.
# PENDIENTE-LEGAL: el texto mostrado vive en el frontend; esta versión lo ancla.
CURRENT_CONSENT_VERSION = "2026-08-v1"

# Recursos auditables (columna ``resource`` de data_access_log).
RESOURCE_ROSTER = "roster"
RESOURCE_ASSESSMENT_STATE = "assessment_state"
RESOURCE_PROGRESS = "progress"


def record_consent(db: Session, *, user: User, version: str) -> UserConsent:
    """Registra la aceptación (idempotente por (user, version))."""
    existing = db.scalar(
        select(UserConsent).where(
            UserConsent.user_id == user.id, UserConsent.consent_version == version
        )
    )
    if existing is not None:
        return existing
    consent = UserConsent(org_id=user.org_id, user_id=user.id, consent_version=version)
    db.add(consent)
    db.flush()
    return consent


def has_active_consent(db: Session, user_id: UUID) -> bool:
    """True si el user aceptó la versión vigente del consentimiento."""
    return (
        db.scalar(
            select(UserConsent.id).where(
                UserConsent.user_id == user_id,
                UserConsent.consent_version == CURRENT_CONSENT_VERSION,
            )
        )
        is not None
    )


def consented_user_ids(db: Session, user_ids: list[UUID]) -> set[UUID]:
    """Subconjunto de ``user_ids`` que aceptó la versión vigente (batch, para el
    roster — evita N queries)."""
    if not user_ids:
        return set()
    return set(
        db.scalars(
            select(UserConsent.user_id).where(
                UserConsent.user_id.in_(user_ids),
                UserConsent.consent_version == CURRENT_CONSENT_VERSION,
            )
        ).all()
    )


def log_access(
    db: Session, *, actor: User, resource: str, target_user_id: UUID | None = None
) -> None:
    """Escribe un registro de auditoría (append-only). ``org_id`` = org del actor
    (contexto desde el que se accedió)."""
    db.add(
        DataAccessLog(
            org_id=actor.org_id,
            actor_user_id=actor.id,
            target_user_id=target_user_id,
            resource=resource,
        )
    )
    db.flush()


# ─────────────────────────── Consentimiento granular v2 (docx §5-7) ───────────────────────────


def get_privacy_consent(db: Session, user_id: UUID) -> UserPrivacyConsent | None:
    return db.scalar(
        select(UserPrivacyConsent).where(UserPrivacyConsent.user_id == user_id)
    )


def privacy_consents_by_user(
    db: Session, user_ids: list[UUID]
) -> dict[UUID, UserPrivacyConsent]:
    """Batch para el roster (evita N queries)."""
    if not user_ids:
        return {}
    return {
        c.user_id: c
        for c in db.scalars(
            select(UserPrivacyConsent).where(UserPrivacyConsent.user_id.in_(user_ids))
        ).all()
    }


def set_privacy_consent(
    db: Session, *, user: User, consent_manager: bool, consent_hr: bool
) -> UserPrivacyConsent:
    """Upsert de las preferencias del colaborador + log append-only de cada scope
    que cambió (auditoría Ley 8968). ``"Ahora no"`` = ambos ``False``."""
    row = get_privacy_consent(db, user.id)
    if row is None:
        row = UserPrivacyConsent(org_id=user.org_id, user_id=user.id)
        db.add(row)
    for scope, new_value, old_value in (
        ("manager", consent_manager, row.consent_manager),
        ("hr", consent_hr, row.consent_hr),
    ):
        if old_value != new_value:
            db.add(
                ConsentChangeLog(
                    org_id=user.org_id, user_id=user.id, scope=scope, value=new_value
                )
            )
    row.consent_manager = consent_manager
    row.consent_hr = consent_hr
    db.flush()
    return row


def consent_manager_ok(consent: UserPrivacyConsent | None) -> bool:
    """True si el colaborador autorizó a su jefe directo."""
    return consent is not None and consent.consent_manager is True


def consent_hr_ok(consent: UserPrivacyConsent | None) -> bool:
    """True si el colaborador autorizó a RRHH (agregado)."""
    return consent is not None and consent.consent_hr is True


def consent_status(consent_value: bool | None, has_activity: bool) -> str:
    """Uno de los 4 estados de dashboard (docx §6.2) para un scope dado."""
    if consent_value is None:
        return STATUS_PENDING
    if consent_value is False:
        return STATUS_DECLINED
    return STATUS_DATA_AVAILABLE if has_activity else STATUS_AUTHORIZED_NO_ACTIVITY
