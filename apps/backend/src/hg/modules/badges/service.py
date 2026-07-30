"""Lógica de badges."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.badges.models import Badge, UserBadge
from hg.modules.badges.schemas import MyBadgeOut
from hg.modules.identity.models import User


def list_my_badges(db: Session, user: User) -> list[MyBadgeOut]:
    """Catálogo activo + estado de desbloqueo del usuario.

    Devuelve todos los badges activos, marcando cuáles desbloqueó el user (RLS
    limita ``user_badges`` a su org). Catálogo vacío → lista vacía.
    """
    badges = list(
        db.scalars(
            select(Badge).where(Badge.is_active.is_(True)).order_by(Badge.order_index, Badge.code)
        ).all()
    )
    unlocked = {
        ub.badge_id: ub.unlocked_at
        for ub in db.scalars(select(UserBadge).where(UserBadge.user_id == user.id)).all()
    }
    return [
        MyBadgeOut(
            code=b.code,
            name=b.name,
            description=b.description,
            icon_url=b.icon_url,
            unlock_hint=b.unlock_hint,
            unlocked=b.id in unlocked,
            unlocked_at=unlocked.get(b.id),
        )
        for b in badges
    ]
