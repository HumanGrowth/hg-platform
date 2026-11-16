"""Aviso al administrador de la Empresa cuando alguien no puede aceptar su invitación
porque el pool de licencias se agotó (ADR-0016 · LC-06).

Se manda a los ``company_admin`` activos (si no hay, a los ``admin``). Rate-limit de 1
aviso por empresa cada 24 h (Redis, falla abierto): una ola de invitados rechazados no
puede spamear al administrador. El correo NO incluye datos de la persona que lo intentó.
"""
from __future__ import annotations

import logging
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.core import rate_limit
from hg.modules.identity.models import Company, User, UserRole
from hg.modules.notifications.email_service import email_service

log = logging.getLogger("hg.company.license_alerts")

NOTIFY_WINDOW_SECONDS = 24 * 3600


def notify_pool_exhausted(db: Session, company_id: UUID) -> int:
    """Devuelve a cuántos administradores se les mandó el aviso (0 si está limitado)."""
    if not rate_limit.allow(
        "pool_exhausted_notify", str(company_id), limit=1, window_seconds=NOTIFY_WINDOW_SECONDS
    ):
        return 0
    company = db.get(Company, company_id)
    if company is None:
        return 0
    admins = list(
        db.scalars(
            select(User).where(
                User.company_id == company_id,
                User.is_active.is_(True),
                User.role == UserRole.company_admin,
            )
        ).all()
    ) or list(
        db.scalars(
            select(User).where(
                User.company_id == company_id,
                User.is_active.is_(True),
                User.role == UserRole.admin,
            )
        ).all()
    )
    # Mismo cómputo que identity.service.company_active_users (no se importa para evitar un ciclo).
    active = int(
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(User.company_id == company_id, User.is_active.is_(True))
        )
        or 0
    )
    sent = 0
    for admin in admins:
        try:
            email_service.send(
                to=admin.email,
                subject="Tu empresa alcanzó su límite de licencias",
                template="license_pool_exhausted",
                context={
                    "admin_name": admin.full_name,
                    "company_name": company.name,
                    "active": active,
                    "pool": company.licenses_total,
                },
            )
            sent += 1
        except Exception:  # el aviso nunca debe romper el flujo de la persona
            log.exception("license_alert.send_failed")
    return sent
