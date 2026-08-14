"""Endpoints de consentimiento granular del colaborador (TASK 5 · docx v1.0).

``/me/consent`` corre bajo ``get_current_user`` (rol hg_app, RLS por org). El user
consulta y decide dos autorizaciones independientes (jefe directo + RRHH). Sirve
tanto para aceptar como para ``"Ahora no"`` (ambos ``False``) y para revocar.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.consent import service
from hg.modules.consent.schemas import ConsentStatusOut, SetConsentRequest
from hg.modules.identity.models import User

router = APIRouter()


def _status(consent) -> ConsentStatusOut:  # type: ignore[no-untyped-def]
    if consent is None:
        return ConsentStatusOut()
    return ConsentStatusOut(
        consent_manager=consent.consent_manager,
        consent_hr=consent.consent_hr,
        updated_at=consent.updated_at,
    )


@router.get("/consent", response_model=ConsentStatusOut)
def get_consent(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsentStatusOut:
    return _status(service.get_privacy_consent(db, current_user.id))


@router.post("/consent", response_model=ConsentStatusOut)
def set_consent(
    body: SetConsentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConsentStatusOut:
    """Setea ambos scopes (aceptar / "Ahora no" / revocar). Idempotente; registra
    cada cambio en el log de auditoría."""
    consent = service.set_privacy_consent(
        db, user=current_user,
        consent_manager=body.consent_manager, consent_hr=body.consent_hr,
    )
    return _status(consent)
