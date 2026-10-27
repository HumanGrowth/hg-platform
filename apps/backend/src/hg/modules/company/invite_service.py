"""Envío, reenvío y descarte de invitados de una Empresa (pre-provisioning BP-01).

Un **invitado** (`User.is_invited`) ya tiene su cuenta configurada (org, rol, manager,
módulos de la org) pero la persona aún no aceptó. Su estado de invitación se deriva:

- ``staged``  → todavía no se le mandó el correo (no hay invitación vigente);
- ``sent``    → hay una invitación vigente;
- ``expired`` → la invitación que se le mandó venció (se reenvía con un token nuevo).

El correo se manda SOLO desde acá (o desde el bulk con ``send_invitations``): cargar la
estructura nunca dispara correos por sí solo.

Corre bajo la sesión del caller: sólo ``flush()``, nunca ``commit()`` (invariante 2).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from hg.modules.company import service as company_service
from hg.modules.identity import service as identity_service
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Organization, User

# Tope por llamada: el correo se manda en línea (Resend), no en una cola.
MAX_SEND_PER_CALL = 200


@dataclass
class SendResult:
    sent: int = 0
    skipped: int = 0
    # Quedan invitados por enviar que no entraron en esta llamada (tope).
    remaining: int = 0
    errors: dict[str, str] = field(default_factory=dict)  # email → motivo


def pending_invitation_expiry(db: Session, company_id: UUID) -> dict[tuple[UUID, str], datetime]:
    """(org, correo en minúsculas) → vencimiento de la invitación sin aceptar ni
    revocar más reciente. Alimenta el estado staged/sent/expired del roster."""
    expiry: dict[tuple[UUID, str], datetime] = {}
    for org_id, email, expires_at in db.execute(
        select(Invitation.org_id, Invitation.email, Invitation.expires_at)
        .join(Organization, Organization.id == Invitation.org_id)
        .where(
            Organization.company_id == company_id,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
        .order_by(Invitation.expires_at)
    ).all():
        expiry[(org_id, email.lower())] = expires_at  # la última (más tardía) gana
    return expiry


def invite_status(user: User, expiry: dict[tuple[UUID, str], datetime]) -> str | None:
    if not user.is_invited:
        return None
    expires_at = expiry.get((user.org_id, user.email.lower()))
    if expires_at is None:
        return "staged"
    return "expired" if expires_at <= datetime.now(UTC) else "sent"


def _company_invited(db: Session, company_id: UUID) -> list[User]:
    return list(
        db.scalars(
            select(User)
            .where(User.company_id == company_id, User.is_invited.is_(True))
            .order_by(User.created_at)
        ).all()
    )


def send_to_users(
    db: Session, *, actor: User, user_ids: list[UUID], only_unsent: bool
) -> tuple[int, dict[str, str]]:
    """Manda (o reenvía) la invitación a esos invitados. Con ``only_unsent`` se salta a
    quien ya tiene una invitación vigente (no se spamea). Cada envío es un SAVEPOINT: un
    fallo no frena al resto. Devuelve ``(enviadas, {correo: motivo})``."""
    users = list(db.scalars(select(User).where(User.id.in_(user_ids))).all()) if user_ids else []
    expiry = pending_invitation_expiry(db, users[0].company_id) if users else {}
    sent = 0
    failed: dict[str, str] = {}
    for user in users:
        if not user.is_invited:
            continue
        if only_unsent and invite_status(user, expiry) in ("sent",):
            continue
        try:
            with db.begin_nested():
                identity_service.issue_invitation(db, user=user, invited_by=actor)
            sent += 1
        except HTTPException as exc:
            failed[user.email] = str(exc.detail)
    return sent, failed


def send_invitations(
    db: Session,
    *,
    company_id: UUID,
    actor: User,
    org_id: UUID | None = None,
    user_ids: list[UUID] | None = None,
    include_expired: bool = True,
) -> SendResult:
    """Envío en lote.

    - ``user_ids``: exactamente esas personas (sirve para reenviar a una puntual).
    - si no, todos los invitados de la Empresa (o de ``org_id``) que aún NO tienen
      correo enviado y, con ``include_expired``, los de invitación vencida."""
    company_service._get_company(db, company_id)
    if org_id is not None:
        company_service.require_company_org(db, company_id, org_id)

    invited = _company_invited(db, company_id)
    if org_id is not None:
        invited = [u for u in invited if u.org_id == org_id]
    expiry = pending_invitation_expiry(db, company_id)

    if user_ids is not None:
        wanted = set(user_ids)
        targets = [u for u in invited if u.id in wanted]
    else:
        keep = {"staged", "expired"} if include_expired else {"staged"}
        targets = [u for u in invited if invite_status(u, expiry) in keep]

    result = SendResult()
    batch, rest = targets[:MAX_SEND_PER_CALL], targets[MAX_SEND_PER_CALL:]
    result.remaining = len(rest)
    sent, failed = send_to_users(
        db, actor=actor, user_ids=[u.id for u in batch], only_unsent=False
    )
    result.sent = sent
    result.errors = failed
    result.skipped = len(batch) - sent - len(failed)
    return result


def resend_invitation(db: Session, *, company_id: UUID, user_id: UUID, actor: User) -> None:
    """Reenvía la invitación de UNA persona (token nuevo; el anterior queda revocado)."""
    member = company_service._require_company_member(db, company_id, user_id)
    if not member.is_invited:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="La persona ya aceptó su invitación."
        )
    identity_service.issue_invitation(db, user=member, invited_by=actor)


def discard_invited(db: Session, *, company_id: UUID, user_id: UUID) -> None:
    """Descarta a un invitado que aún no aceptó (p.ej. una fila cargada por error):
    revoca sus invitaciones y elimina la cuenta. Sus reportes quedan sin manager."""
    member = company_service._require_company_member(db, company_id, user_id)
    if not member.is_invited:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se puede descartar a quien todavía no aceptó la invitación.",
        )
    now = datetime.now(UTC)
    for inv in db.scalars(
        select(Invitation).where(
            Invitation.org_id == member.org_id,
            func.lower(Invitation.email) == member.email.lower(),
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
    ).all():
        inv.revoked_at = now
    db.execute(delete(User).where(User.id == member.id, User.is_invited.is_(True)))
    db.flush()
