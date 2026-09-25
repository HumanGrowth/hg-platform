"""Seed del catálogo de badges (Sprint Tarde · TASK 4).

Un badge por dimensión (6), mapeado al ícono hexagonal del pilar en
``frontend/public/icons`` (los mismos que usa ``HexIcon``):

    CP→P1 rocket · PR→P2 star · RE→P3 chat · SA→P4 sprout · PI→P5 bulb · ES→P6 scales

Idempotente: upsert por ``code``. Re-ejecutable (segunda corrida = 0 inserts).
Corre bajo ``hg``/owner (el catálogo ``badges`` no tiene RLS). El desbloqueo
(``user_badges``) es un feature aparte — hoy los badges arrancan bloqueados.
"""
from __future__ import annotations

import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.badges.models import Badge

log = logging.getLogger("hg.seed_badges")

# (code, name, icon, description, unlock_hint, order)
#
# Vacío a propósito: el catálogo viejo `dimension-*` (un badge genérico por
# dimensión) fue reemplazado por los badges de nivel (`level-*`, sembrados por
# el motor de progresión) y de pilar (`pillar-*`, `ensure_pillar_badge` desde el
# sync de contenido), y se borró de la base (migración PF-03). Este script ya
# no debe recrearlos en un ambiente nuevo.
_BADGES: list[tuple[str, str, str, str, str, int]] = []


def seed(db: Session) -> dict[str, int]:
    inserted = updated = 0
    for code, name, icon, desc, hint, order in _BADGES:
        badge = db.scalar(select(Badge).where(Badge.code == code))
        if badge is None:
            db.add(
                Badge(
                    code=code, name=name, icon_url=icon, description=desc,
                    unlock_hint=hint, order_index=order, is_active=True,
                )
            )
            inserted += 1
        else:
            badge.name, badge.icon_url = name, icon
            badge.description, badge.unlock_hint = desc, hint
            badge.order_index, badge.is_active = order, True
            updated += 1
    db.commit()
    return {"inserted": inserted, "updated": updated}


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    db = SessionLocal()
    try:
        stats = seed(db)
        print(f"seed_badges: {stats['inserted']} inserted, {stats['updated']} updated.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
