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

from hg.modules.consent.models import DataAccessLog, UserConsent
from hg.modules.identity.models import User

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
