"""Endpoints de consentimiento del colaborador (Capa Empresa · TASK 5).

``/me/consent`` corre bajo ``get_current_user`` (rol hg_app, RLS por org). El user
consulta y acepta la versión vigente del consentimiento de privacidad de datos.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.consent import service
from hg.modules.consent.models import UserConsent
from hg.modules.consent.schemas import ConsentStatusOut
from hg.modules.identity.models import User

router = APIRouter()


def _status(db: Session, user: User) -> ConsentStatusOut:
    row = db.scalar(
        select(UserConsent).where(
            UserConsent.user_id == user.id,
            UserConsent.consent_version == service.CURRENT_CONSENT_VERSION,
        )
    )
    return ConsentStatusOut(
        current_version=service.CURRENT_CONSENT_VERSION,
        accepted=row is not None,
        accepted_at=row.accepted_at if row is not None else None,
    )


@router.get("/consent", response_model=ConsentStatusOut)
def get_consent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsentStatusOut:
    return _status(db, current_user)


@router.post("/consent", response_model=ConsentStatusOut)
def accept_consent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsentStatusOut:
    """Acepta la versión **vigente** (server-authoritative). Idempotente."""
    service.record_consent(db, user=current_user, version=service.CURRENT_CONSENT_VERSION)
    return _status(db, current_user)
