"""Enrollment service — funciones puras (testables sin FastAPI).

Operan bajo una Session ya scopeada al tenant (hg_app + app.current_org_id).
`career_path_code` inválido → ValueError (el router lo traduce a 422).
"""
from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.learning.models import CareerPath, Enrollment


class InvalidPathCodeError(ValueError):
    """career_path_code no corresponde a ningún CareerPath."""


def _path_by_code(db: Session, code: str) -> CareerPath:
    path = db.scalar(select(CareerPath).where(CareerPath.code == code))
    if path is None:
        raise InvalidPathCodeError(code)
    return path


def enroll_user_in_path(
    db: Session,
    *,
    org_id: UUID,
    target_user_id: UUID,
    career_path_code: str,
    assigned_by_user_id: UUID,
) -> Enrollment:
    """Upsert enrollment. Si ya existía (incluso inactivo), lo reactiva."""
    path = _path_by_code(db, career_path_code)
    existing = db.scalar(
        select(Enrollment).where(
            Enrollment.user_id == target_user_id,
            Enrollment.career_path_id == path.id,
        )
    )
    if existing is not None:
        existing.is_active = True
        existing.source = "manual"
        existing.assigned_by_user_id = assigned_by_user_id
        db.flush()
        return existing

    enrollment = Enrollment(
        org_id=org_id,
        user_id=target_user_id,
        career_path_id=path.id,
        assigned_by_user_id=assigned_by_user_id,
        source="manual",
        is_active=True,
    )
    db.add(enrollment)
    db.flush()
    return enrollment


def list_user_enrollments(
    db: Session, *, user_id: UUID, active_only: bool = True
) -> list[Enrollment]:
    conds = [Enrollment.user_id == user_id]
    if active_only:
        conds.append(Enrollment.is_active.is_(True))
    return list(
        db.scalars(
            select(Enrollment).where(*conds).order_by(Enrollment.enrolled_at.desc())
        ).all()
    )


def unenroll_user_from_path(
    db: Session, *, org_id: UUID, target_user_id: UUID, career_path_code: str
) -> None:
    """Soft delete — set is_active=False. No-op si no existe."""
    path = _path_by_code(db, career_path_code)
    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.user_id == target_user_id,
            Enrollment.career_path_id == path.id,
        )
    )
    if enrollment is not None:
        enrollment.is_active = False
        db.flush()
