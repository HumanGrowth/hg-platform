"""Guardia de sobrecupo de licencias (ADR-0016 · LC-06).

El cupo cuenta al ACEPTAR (decisión firmada): las invitaciones no consumen licencia hasta
que se aceptan. Por eso, antes de ENVIAR invitaciones se proyecta el uso:

    proyectado = activos + invitados vigentes + los que se están por invitar

y si supera el pool de la Empresa el envío se frena (409 ``license_overage``) hasta que
alguien con rol ``company_admin`` / ``admin`` / ``superadmin`` lo reconozca explícitamente
(``acknowledge_overage=true``); el reconocimiento queda en ``company_lifecycle_events``.
El cupo por organización (``license_quota``) sigue siendo solo una advertencia.

Corre bajo la sesión del caller: ``flush()``, nunca ``commit()`` (invariante 2).
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session

from hg.modules.company.models import CompanyLifecycleEvent
from hg.modules.identity import service as identity_service
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Company, User

OVERAGE_EVENT = "overage_acknowledged"


@dataclass(frozen=True)
class LicenseUsage:
    active: int  # users activos (licencias usadas hoy)
    invited: int  # invitados con invitación vigente (aún sin aceptar)
    to_invite: int  # los que están por recibir invitación en esta operación
    pool: int  # licenses_total de la Empresa

    @property
    def overage(self) -> int:
        return max(0, self.active + self.invited + self.to_invite - self.pool)

    def as_dict(self) -> dict[str, int]:
        return {**asdict(self), "overage": self.overage}


def _has_live_invitation():  # type: ignore[no-untyped-def]
    """EXISTS: el invitado tiene una invitación sin aceptar, sin revocar y no vencida."""
    return exists().where(
        Invitation.org_id == User.org_id,
        func.lower(Invitation.email) == func.lower(User.email),
        Invitation.accepted_at.is_(None),
        Invitation.revoked_at.is_(None),
        Invitation.expires_at > func.now(),
    )


def unsent_invited_ids(db: Session, company_id: UUID, user_ids: list[UUID] | None = None) -> list[UUID]:
    """Invitados SIN invitación vigente (staged o vencida): los que recibirían un correo
    nuevo. ``user_ids`` acota a esas personas."""
    stmt = select(User.id).where(
        User.company_id == company_id, User.is_invited.is_(True), ~_has_live_invitation()
    )
    if user_ids is not None:
        stmt = stmt.where(User.id.in_(user_ids))
    return list(db.scalars(stmt).all())


def projected_license_usage(db: Session, company_id: UUID, extra_invites: int) -> LicenseUsage:
    """Función pura (solo lee): uso proyectado de licencias si se invita a ``extra_invites``
    personas más. Punto único de cálculo: lo reusan el bulk, el envío de invitaciones y la
    advertencia estructurada."""
    company = db.get(Company, company_id)
    pool = company.licenses_total if company is not None else 0
    invited = int(
        db.scalar(
            select(func.count())
            .select_from(User)
            .where(
                User.company_id == company_id, User.is_invited.is_(True), _has_live_invitation()
            )
        )
        or 0
    )
    return LicenseUsage(
        active=identity_service.company_active_users(db, company_id),
        invited=invited,
        to_invite=max(0, extra_invites),
        pool=pool,
    )


def enforce_overage_guard(
    db: Session,
    *,
    company_id: UUID,
    actor: User,
    to_invite: int,
    acknowledge_overage: bool,
    source: str,
) -> LicenseUsage:
    """Frena el envío (409 ``license_overage``) si el uso proyectado supera el pool y no
    hay reconocimiento. Con reconocimiento deja un ``overage_acknowledged`` (actor, números,
    momento). Debe llamarse ANTES de mandar cualquier correo."""
    usage = projected_license_usage(db, company_id, to_invite)
    if usage.overage <= 0:
        return usage
    if not acknowledge_overage:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "license_overage",
                "message": (
                    "Con estas invitaciones se superan las licencias de la empresa. "
                    "Ajusta las licencias o reconoce el sobrecupo para enviar de todos modos."
                ),
                **usage.as_dict(),
            },
        )
    db.add(
        CompanyLifecycleEvent(
            company_id=company_id,
            event_type=OVERAGE_EVENT,
            actor_user_id=actor.id,
            meta={**usage.as_dict(), "source": source},
        )
    )
    db.flush()
    return usage
