"""Ciclo de vida de la Empresa (ADR-0016): único escritor de ``companies.status``.

``transition_company`` valida la matriz de transiciones, exige motivo donde
corresponde, calcula ``grace_ends_at`` al entrar a gracia, escribe el evento de
auditoría (append-only) y hace ``db.flush()`` — **nunca** ``commit`` (invariante #2).

No toca a los usuarios de la Empresa: el estado vive en la empresa.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Final
from uuid import UUID

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.company.models import CompanyLifecycleEvent
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Company, Organization, User, UserRole

TRIAL: Final = "trial"
ACTIVE: Final = "active"
GRACE: Final = "grace"
SUSPENDED: Final = "suspended"
TERMINATED: Final = "terminated"

STATUSES: Final = (TRIAL, ACTIVE, GRACE, SUSPENDED, TERMINATED)

# Matriz de transiciones permitidas (ADR-0016). Todo lo demás es 409.
ALLOWED_TRANSITIONS: Final[dict[str, frozenset[str]]] = {
    TRIAL: frozenset({ACTIVE, GRACE}),
    ACTIVE: frozenset({GRACE, SUSPENDED}),  # active→suspended = corte de emergencia
    GRACE: frozenset({ACTIVE, SUSPENDED}),
    SUSPENDED: frozenset({ACTIVE, TERMINATED}),
    TERMINATED: frozenset({SUSPENDED}),  # rescate
}

# Destinos que exigen motivo no vacío.
REASON_REQUIRED: Final = frozenset({SUSPENDED, TERMINATED})


class LifecyclePreview(BaseModel):
    """Qué pasaría al aplicar una transición (dry-run). No escribe nada."""

    company_id: UUID
    from_status: str
    to_status: str
    active_users_by_role: dict[str, int]
    active_users_total: int
    pending_invitations: int
    admins: int  # company_admin + admin activos (a quienes hay que avisar)
    grace_ends_at: datetime | None


def _error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=http_status, detail={"code": code, "message": message})


def _now() -> datetime:
    return datetime.now(UTC)


def _preview(db: Session, company: Company, to_status: str, grace_ends_at: datetime | None) -> LifecyclePreview:
    rows = db.execute(
        select(User.role, func.count())
        .where(User.company_id == company.id, User.is_active.is_(True))
        .group_by(User.role)
    ).all()
    by_role = {role.value: int(n) for role, n in rows}
    pending = db.scalar(
        select(func.count())
        .select_from(Invitation)
        .join(Organization, Organization.id == Invitation.org_id)
        .where(
            Organization.company_id == company.id,
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
            Invitation.expires_at > _now(),
        )
    )
    return LifecyclePreview(
        company_id=company.id,
        from_status=company.status,
        to_status=to_status,
        active_users_by_role=by_role,
        active_users_total=sum(by_role.values()),
        pending_invitations=int(pending or 0),
        admins=by_role.get(UserRole.company_admin.value, 0) + by_role.get(UserRole.admin.value, 0),
        grace_ends_at=grace_ends_at,
    )


def _guard_last_superadmin(db: Session, company: Company) -> None:
    """No se puede cortar la empresa que aloja al último superadmin activo.

    El enforcement (LC-04) exime a superadmin, pero suspender igual dejaría la
    operación sin una cuenta de rescate en una empresa sana: lo impedimos.
    """
    in_company = db.scalar(
        select(func.count())
        .select_from(User)
        .where(
            User.company_id == company.id,
            User.role == UserRole.superadmin,
            User.is_active.is_(True),
        )
    )
    if not in_company:
        return
    elsewhere = db.scalar(
        select(func.count())
        .select_from(User)
        .where(
            User.role == UserRole.superadmin,
            User.is_active.is_(True),
            User.company_id != company.id,
        )
    )
    if not elsewhere:
        raise _error(
            status.HTTP_409_CONFLICT,
            "last_superadmin",
            "No se puede suspender la empresa del último superadmin activo.",
        )


def transition_company(
    db: Session,
    *,
    company_id: UUID,
    to_status: str,
    actor: User | None,
    reason: str | None,
    dry_run: bool = False,
) -> LifecyclePreview:
    """Único escritor de ``companies.status``. Devuelve el preview (también al aplicar).

    ``actor=None`` = proceso automático (job LC-09). Errores: 404 empresa
    inexistente, 409 transición inválida / último superadmin, 422 motivo faltante
    (salvo ``dry_run``).
    """
    company = db.scalar(select(Company).where(Company.id == company_id).with_for_update())
    if company is None:
        raise _error(status.HTTP_404_NOT_FOUND, "company_not_found", "Empresa no encontrada.")
    if to_status not in STATUSES:
        raise _error(status.HTTP_422_UNPROCESSABLE_CONTENT, "invalid_status", f"Estado inválido: {to_status}.")

    from_status = company.status
    if to_status not in ALLOWED_TRANSITIONS.get(from_status, frozenset()):
        raise _error(
            status.HTTP_409_CONFLICT,
            "invalid_transition",
            f"Transición no permitida: {from_status} → {to_status}.",
        )
    clean_reason = (reason or "").strip()
    # La vista previa no exige motivo: la UI lo pide DESPUÉS de mostrar los números.
    if to_status in REASON_REQUIRED and not clean_reason and not dry_run:
        raise _error(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            "reason_required",
            f"El motivo es obligatorio para pasar a {to_status}.",
        )
    if to_status in (SUSPENDED, TERMINATED):
        _guard_last_superadmin(db, company)

    now = _now()
    grace_ends_at = now + timedelta(days=company.grace_days) if to_status == GRACE else None
    preview = _preview(db, company, to_status, grace_ends_at)
    if dry_run:
        return preview

    company.status = to_status
    company.status_changed_at = now
    company.status_reason = clean_reason or None
    company.grace_ends_at = grace_ends_at
    db.add(
        CompanyLifecycleEvent(
            company_id=company.id,
            event_type="status_change",
            from_status=from_status,
            to_status=to_status,
            actor_user_id=actor.id if actor else None,
            reason=clean_reason or None,
            meta={
                "grace_days": company.grace_days,
                "grace_ends_at": grace_ends_at.isoformat() if grace_ends_at else None,
                "active_users": preview.active_users_total,
            },
        )
    )
    db.flush()
    return preview
