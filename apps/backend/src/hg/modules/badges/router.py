"""Endpoints de badges — montado bajo /me."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.badges import progression, service
from hg.modules.badges.schemas import DimensionProgressionOut, MyBadgeOut
from hg.modules.identity.models import User

me_router = APIRouter()


@me_router.get("/badges", response_model=list[MyBadgeOut])
def list_my_badges(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MyBadgeOut]:
    """Catálogo de badges + estado de desbloqueo del usuario autenticado."""
    return service.list_my_badges(db, current_user)


@me_router.get("/progression", response_model=list[DimensionProgressionOut])
def my_progression(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[DimensionProgressionOut]:
    """Progreso por dimensión (nivel actual + completion 0-100) para el perfil."""
    return [
        DimensionProgressionOut(**d) for d in progression.progression_summary(db, current_user.id)
    ]
