"""Asignaciones de módulos por manager/admin (cierre-beta TASK 3).

- Admin/manager: `/admin/users/{user_id}/assignments` (list/create) +
  `/admin/assignments/{id}` (patch/delete).
- Colaborador: `/me/assignments` (sus propias asignaciones, para el badge).

Autorización: manager (sobre sus reportes) o admin/superadmin (sobre su org).
RLS por org aísla las filas; los checks de rol/target son explícitos.

Regla DB (P0 PR #57): bajo `get_db` el rol hg_app se pierde al commitear a mitad
del handler → se usa `flush()` y `get_db` commitea al final.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user
from hg.db import get_db
from hg.modules.identity.models import User, UserRole
from hg.modules.learning_units.area_access import enabled_area_codes, visible_units_predicate
from hg.modules.learning_units.models import LearningUnit, ModuleAssignment

admin_router = APIRouter()
me_router = APIRouter()

_MANAGE_ROLES = {UserRole.manager, UserRole.admin, UserRole.superadmin}
_ADMIN_ROLES = {UserRole.admin, UserRole.superadmin}


# ─────────────────────────── Schemas ───────────────────────────


class AssignModulesRequest(BaseModel):
    unit_ids: list[UUID] = Field(min_length=1, max_length=100)
    due_date: datetime | None = None
    note: str | None = Field(default=None, max_length=1000)


class UpdateAssignmentRequest(BaseModel):
    due_date: datetime | None = None
    note: str | None = Field(default=None, max_length=1000)


class ModuleAssignmentOut(BaseModel):
    id: UUID
    user_id: UUID
    learning_unit_id: UUID
    unit_slug: str
    unit_title: str
    status: str
    note: str | None
    due_date: datetime | None
    assigned_at: datetime
    assigned_by_user_id: UUID | None
    assigned_by_name: str | None


class AssignableUnitOut(BaseModel):
    id: UUID
    slug: str
    title: str
    dimension_code: str
    level_code: str
    pillar_code: int | None


# ─────────────────────────── Helpers ───────────────────────────


def _authorize_manage_target(db: Session, current_user: User, user_id: UUID) -> User:
    """El target debe estar en la org (RLS) y ser reporte directo, salvo
    admin/superadmin. 404 si no es visible/gestionable por el usuario."""
    if current_user.role not in _MANAGE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role")
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    if current_user.role in _ADMIN_ROLES or target.manager_id == current_user.id:
        return target
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")


def _out(a: ModuleAssignment, units: dict[UUID, LearningUnit], names: dict[UUID, str]) -> ModuleAssignmentOut:
    unit = units.get(a.learning_unit_id)
    return ModuleAssignmentOut(
        id=a.id,
        user_id=a.user_id,
        learning_unit_id=a.learning_unit_id,
        unit_slug=unit.slug if unit else "?",
        unit_title=unit.title if unit else "?",
        status=a.status,
        note=a.note,
        due_date=a.due_date,
        assigned_at=a.assigned_at,
        assigned_by_user_id=a.assigned_by_user_id,
        assigned_by_name=names.get(a.assigned_by_user_id) if a.assigned_by_user_id else None,
    )


def _serialize(db: Session, assignments: list[ModuleAssignment]) -> list[ModuleAssignmentOut]:
    unit_ids = {a.learning_unit_id for a in assignments}
    assigner_ids = {a.assigned_by_user_id for a in assignments if a.assigned_by_user_id}
    units = {
        u.id: u for u in db.scalars(select(LearningUnit).where(LearningUnit.id.in_(unit_ids))).all()
    } if unit_ids else {}
    names = {
        u.id: u.full_name for u in db.scalars(select(User).where(User.id.in_(assigner_ids))).all()
    } if assigner_ids else {}
    return [_out(a, units, names) for a in assignments]


# ─────────────────────────── Admin/manager ───────────────────────────


@admin_router.get("/assignable-units", response_model=list[AssignableUnitOut])
def list_assignable_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssignableUnitOut]:
    """Units publicadas para elegir en el modal de asignación (manager/admin)."""
    if current_user.role not in _MANAGE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role")
    rows = db.scalars(
        select(LearningUnit)
        .where(
            LearningUnit.published_at.isnot(None),
            LearningUnit.superseded_by_unit_id.is_(None),
            visible_units_predicate(current_user),  # solo Áreas habilitadas (TASK 8)
        )
        .order_by(
            LearningUnit.dimension_code.asc(),
            LearningUnit.level_code.asc(),
            LearningUnit.pillar_code.asc(),
            LearningUnit.unit_number.asc(),
        )
    ).all()
    return [
        AssignableUnitOut(
            id=u.id, slug=u.slug, title=u.title, dimension_code=u.dimension_code,
            level_code=u.level_code, pillar_code=u.pillar_code,
        )
        for u in rows
    ]


@admin_router.get("/users/{user_id}/assignments", response_model=list[ModuleAssignmentOut])
def list_user_assignments(
    user_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ModuleAssignmentOut]:
    target = _authorize_manage_target(db, current_user, user_id)
    rows = list(
        db.scalars(
            select(ModuleAssignment)
            .where(ModuleAssignment.user_id == target.id)
            .order_by(ModuleAssignment.assigned_at.desc())
        ).all()
    )
    return _serialize(db, rows)


@admin_router.post(
    "/users/{user_id}/assignments",
    response_model=list[ModuleAssignmentOut],
    status_code=status.HTTP_201_CREATED,
)
def assign_modules(
    user_id: UUID,
    body: AssignModulesRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ModuleAssignmentOut]:
    target = _authorize_manage_target(db, current_user, user_id)

    units = list(
        db.scalars(
            select(LearningUnit).where(LearningUnit.id.in_(body.unit_ids))
        ).all()
    )
    valid_ids = {u.id for u in units}
    missing = set(body.unit_ids) - valid_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"learning units inexistentes: {sorted(str(m) for m in missing)}",
        )
    # Gating por Área (TASK 8): no se puede asignar contenido de un Área que la
    # Empresa del colaborador no tiene habilitada (el general — area_code NULL — sí).
    enabled = enabled_area_codes(db, target.company_id)
    blocked = [
        u.slug for u in units if u.area_code is not None and u.area_code not in enabled
    ]
    if blocked:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Área no habilitada para la empresa: {sorted(blocked)}",
        )
    # Dedup contra lo ya asignado (respeta el unique constraint sin romper).
    already = set(
        db.scalars(
            select(ModuleAssignment.learning_unit_id).where(
                ModuleAssignment.user_id == target.id,
                ModuleAssignment.learning_unit_id.in_(valid_ids),
            )
        ).all()
    )
    to_create = [uid for uid in body.unit_ids if uid in valid_ids and uid not in already]
    created = [
        ModuleAssignment(
            org_id=target.org_id,
            user_id=target.id,
            learning_unit_id=uid,
            assigned_by_user_id=current_user.id,
            due_date=body.due_date,
            note=body.note,
        )
        for uid in to_create
    ]
    db.add_all(created)
    db.flush()  # no commit a mitad (ver nota del módulo); get_db commitea al final
    for a in created:
        db.refresh(a)
    return _serialize(db, created)


def _get_assignment_or_404(db: Session, assignment_id: UUID, current_user: User) -> ModuleAssignment:
    if current_user.role not in _MANAGE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role")
    a = db.get(ModuleAssignment, assignment_id)  # RLS ya limita a la org del token
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assignment not found")
    # Manager (no admin) solo gestiona asignaciones de sus reportes.
    if current_user.role not in _ADMIN_ROLES:
        target = db.get(User, a.user_id)
        if target is None or target.manager_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assignment not found")
    return a


@admin_router.patch("/assignments/{assignment_id}", response_model=ModuleAssignmentOut)
def update_assignment(
    assignment_id: UUID,
    body: UpdateAssignmentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ModuleAssignmentOut:
    a = _get_assignment_or_404(db, assignment_id, current_user)
    a.due_date = body.due_date
    a.note = body.note
    db.flush()
    db.refresh(a)
    return _serialize(db, [a])[0]


@admin_router.delete("/assignments/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment(
    assignment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    a = _get_assignment_or_404(db, assignment_id, current_user)
    db.execute(sa_delete(ModuleAssignment).where(ModuleAssignment.id == a.id))
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ─────────────────────────── Colaborador ───────────────────────────


@me_router.get("/assignments", response_model=list[ModuleAssignmentOut])
def my_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ModuleAssignmentOut]:
    rows = list(
        db.scalars(
            select(ModuleAssignment)
            .where(ModuleAssignment.user_id == current_user.id)
            .order_by(ModuleAssignment.assigned_at.desc())
        ).all()
    )
    return _serialize(db, rows)
