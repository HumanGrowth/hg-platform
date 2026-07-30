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
_BADGES: list[tuple[str, str, str, str, str, int]] = [
    (
        "dimension-cp", "Impulso de Carrera", "/icons/hex-rocket-128.png",
        "Reconoce tu avance en Carrera e impacto: cómo crecés y dejás huella en tu trabajo.",
        "Se desbloquea al evaluar y avanzar en tu dimensión de Carrera.", 1,
    ),
    (
        "dimension-pr", "Norte Claro", "/icons/hex-star-128.png",
        "Reconoce tu trabajo en Propósito y significado: el sentido que guía tus días.",
        "Se desbloquea al evaluar y avanzar en tu dimensión de Propósito.", 2,
    ),
    (
        "dimension-re", "Tejedor de Vínculos", "/icons/hex-chat-128.png",
        "Reconoce tu cuidado de las Relaciones y conexión: la calidad de tus vínculos.",
        "Se desbloquea al evaluar y avanzar en tu dimensión de Relaciones.", 3,
    ),
    (
        "dimension-sa", "Raíz Sana", "/icons/hex-sprout-128.png",
        "Reconoce tu cuidado de la Salud y bienestar: la energía que sostiene todo lo demás.",
        "Se desbloquea al evaluar y avanzar en tu dimensión de Salud.", 4,
    ),
    (
        "dimension-pi", "Mente Serena", "/icons/hex-bulb-128.png",
        "Reconoce tu trabajo en Paz interior y claridad: calma y foco para decidir.",
        "Se desbloquea al evaluar y avanzar en tu dimensión de Paz interior.", 5,
    ),
    (
        "dimension-es", "Base Firme", "/icons/hex-scales-128.png",
        "Reconoce tu Estabilidad emocional y material: la resiliencia que te sostiene.",
        "Se desbloquea al evaluar y avanzar en tu dimensión de Estabilidad.", 6,
    ),
]


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
