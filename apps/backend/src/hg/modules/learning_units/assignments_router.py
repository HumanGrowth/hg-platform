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

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, get_db_as_superadmin, require_role
from hg.db import get_db
from hg.modules.company import service as company_service
from hg.modules.identity.models import User, UserRole
from hg.modules.learning_units.area_access import (
    blocked_by_content_access,
    company_content_access,
    enabled_area_codes,
    visible_units_predicate,
)
from hg.modules.learning_units.assignment_status import (
    assignment_completed_clause,
    completed_assignment_ids,
    effective_status,
)
from hg.modules.learning_units.models import (
    LearningUnit,
    ModuleAssignment,
    OrgModuleAssignment,
)
from hg.modules.learning_units.org_modules import upsert_org_modules
from hg.modules.notifications.tasks import notify_content_unlocked

admin_router = APIRouter()
me_router = APIRouter()

_MANAGE_ROLES = {UserRole.manager, UserRole.admin, UserRole.company_admin, UserRole.superadmin}
_ADMIN_ROLES = {UserRole.admin, UserRole.company_admin, UserRole.superadmin}


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
    # Corrección post-2.4: team/[id] agrupa "Paths asignados" por pilar (todo
    # lo asignado es CP) — evita que el frontend tenga que cruzar contra el
    # catálogo completo solo para saber a qué pilar pertenece cada unit.
    pillar_code: str | None
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
    pillar_code: str | None
    # Skills (columna `keywords`) — fuente del filtro por Skill en los
    # pickers de asignación (módulos sueltos y rutas custom).
    keywords: list[str] | None = None


class OrgAssignmentSummaryOut(BaseModel):
    """Resultado de asignar un set de units a TODOS los miembros activos de
    una organización (FASE 2.1) — materializa N `ModuleAssignment`, una
    puntual, no una regla que siga a futuros miembros (para eso, `CustomPath`
    en FASE 2.2)."""

    org_id: UUID
    members_targeted: int
    units_targeted: int
    assignments_created: int
    already_assigned: int


class OrgUnitAssignmentAggOut(BaseModel):
    learning_unit_id: UUID
    unit_slug: str
    unit_title: str
    assigned_count: int
    completed_count: int
    overdue_count: int


# ─────────────────────────── Helpers ───────────────────────────


def _authorize_manage_target(db: Session, current_user: User, user_id: UUID) -> User:
    """Corre bajo ``hg_superadmin`` (la Empresa puede tener varias orgs y la RLS
    es por org): la frontera se impone acá. 404 si el target no es gestionable."""
    if current_user.role not in _MANAGE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role")
    target = db.get(User, user_id)
    if target is None or not _can_manage(current_user, target):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="user not found")
    return target


def _can_manage(actor: User, target: User) -> bool:
    """superadmin: todos · admin/company_admin: miembros de SU Empresa (o su org)
    · manager: sus reportes directos."""
    if actor.role == UserRole.superadmin:
        return True
    if actor.role in _ADMIN_ROLES:
        return (actor.company_id is not None and target.company_id == actor.company_id) or (
            target.org_id == actor.org_id
        )
    return target.manager_id == actor.id


def _out(
    a: ModuleAssignment,
    units: dict[UUID, LearningUnit],
    names: dict[UUID, str],
    completed: bool,
) -> ModuleAssignmentOut:
    unit = units.get(a.learning_unit_id)
    return ModuleAssignmentOut(
        id=a.id,
        user_id=a.user_id,
        learning_unit_id=a.learning_unit_id,
        unit_slug=unit.slug if unit else "?",
        unit_title=unit.title if unit else "?",
        pillar_code=unit.pillar_code if unit else None,
        status=effective_status(a.status, completed),
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
    done = completed_assignment_ids(db, assignments)
    return [_out(a, units, names, a.id in done) for a in assignments]


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
            level_code=u.level_code, pillar_code=u.pillar_code, keywords=u.keywords,
        )
        for u in rows
    ]


@admin_router.get("/users/{user_id}/assignments", response_model=list[ModuleAssignmentOut])
def list_user_assignments(
    user_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
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
    db: Session = Depends(get_db_as_superadmin),
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
    blocked_pillars = blocked_by_content_access(units, company_content_access(db, target.company_id))
    if blocked_pillars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Contenido no habilitado para la empresa (dimensión o pilar): {blocked_pillars}",
        )
    # Corrección post-2.4: la asignación manual (manager/admin) solo admite
    # contenido de Carrera Profesional — el resto de las dimensiones se asigna
    # vía score del assessment, no eligiendo módulos a mano.
    non_cp = [u.slug for u in units if u.dimension_code != "CP"]
    if non_cp:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Solo se puede asignar contenido de Carrera Profesional (CP): "
                f"{sorted(non_cp)}"
            ),
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
    if created:
        notify_content_unlocked(db, [target])
    return _serialize(db, created)


# ─────────────────────────── Organización (FASE 2.1) ───────────────────────────

# Cross-org/cross-empresa: corre bajo hg_superadmin + un filtro duro de
# company_id en el handler, mismo patrón que company/router.py (la RLS de
# module_assignments es por org, no por empresa).
_ORG_ASSIGN_ROLES = ("admin", "company_admin", "superadmin")


@admin_router.post(
    "/organizations/{org_id}/assignments",
    response_model=OrgAssignmentSummaryOut,
    status_code=status.HTTP_201_CREATED,
)
def assign_modules_to_organization(
    org_id: UUID,
    body: AssignModulesRequest,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ORG_ASSIGN_ROLES)),
) -> OrgAssignmentSummaryOut:
    """Asigna un set de units a la ORGANIZACIÓN: se registran como módulos de la
    org (todo miembro que se sume después los recibe automáticamente, ver
    `org_modules.apply_org_modules`) y se materializa un `ModuleAssignment` para
    cada miembro ACTIVO actual (aditivo)."""
    org = company_service.require_company_org(
        db, company_service.resolve_company_id(actor, company_id), org_id
    )

    units = list(db.scalars(select(LearningUnit).where(LearningUnit.id.in_(body.unit_ids))).all())
    valid_ids = {u.id for u in units}
    missing = set(body.unit_ids) - valid_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"learning units inexistentes: {sorted(str(m) for m in missing)}",
        )
    enabled = enabled_area_codes(db, org.company_id)
    blocked = [u.slug for u in units if u.area_code is not None and u.area_code not in enabled]
    if blocked:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Área no habilitada para la empresa: {sorted(blocked)}",
        )
    blocked_pillars = blocked_by_content_access(units, company_content_access(db, org.company_id))
    if blocked_pillars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Contenido no habilitado para la empresa (dimensión o pilar): {blocked_pillars}",
        )
    non_cp = [u.slug for u in units if u.dimension_code != "CP"]
    if non_cp:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Solo se puede asignar contenido de Carrera Profesional (CP): "
                f"{sorted(non_cp)}"
            ),
        )

    upsert_org_modules(
        db, org_id=org_id, unit_ids=body.unit_ids, assigned_by=actor.id,
        due_date=body.due_date, note=body.note,
    )
    members = list(
        db.scalars(
            select(User).where(User.org_id == org_id, User.is_active.is_(True))
        ).all()
    )
    already = set(
        db.execute(
            select(ModuleAssignment.user_id, ModuleAssignment.learning_unit_id).where(
                ModuleAssignment.user_id.in_([m.id for m in members]),
                ModuleAssignment.learning_unit_id.in_(valid_ids),
            )
        ).all()
    )
    created = [
        ModuleAssignment(
            org_id=org_id, user_id=m.id, learning_unit_id=uid,
            assigned_by_user_id=actor.id, due_date=body.due_date, note=body.note,
        )
        for m in members
        for uid in body.unit_ids
        if uid in valid_ids and (m.id, uid) not in already
    ]
    db.add_all(created)
    db.flush()
    if created:
        notify_content_unlocked(db, members)
    total_pairs = len(members) * len(valid_ids)
    return OrgAssignmentSummaryOut(
        org_id=org_id,
        members_targeted=len(members),
        units_targeted=len(valid_ids),
        assignments_created=len(created),
        already_assigned=total_pairs - len(created),
    )


class OrgModuleOut(BaseModel):
    learning_unit_id: UUID
    unit_slug: str
    unit_title: str
    pillar_code: str | None
    due_date: datetime | None
    note: str | None
    assigned_at: datetime


@admin_router.get("/organizations/{org_id}/modules", response_model=list[OrgModuleOut])
def list_org_modules(
    org_id: UUID,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ORG_ASSIGN_ROLES)),
) -> list[OrgModuleOut]:
    """Módulos que recibe todo miembro de la organización."""
    company_service.require_company_org(
        db, company_service.resolve_company_id(actor, company_id), org_id
    )
    rows = db.execute(
        select(OrgModuleAssignment, LearningUnit)
        .join(LearningUnit, LearningUnit.id == OrgModuleAssignment.learning_unit_id)
        .where(OrgModuleAssignment.org_id == org_id)
        .order_by(OrgModuleAssignment.assigned_at.desc())
    ).all()
    return [
        OrgModuleOut(
            learning_unit_id=u.id, unit_slug=u.slug, unit_title=u.title,
            pillar_code=u.pillar_code, due_date=a.due_date, note=a.note, assigned_at=a.assigned_at,
        )
        for a, u in rows
    ]


@admin_router.delete(
    "/organizations/{org_id}/modules/{unit_id}", status_code=status.HTTP_204_NO_CONTENT
)
def remove_org_module(
    org_id: UUID,
    unit_id: UUID,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ORG_ASSIGN_ROLES)),
) -> Response:
    """Quita el módulo de la organización: los miembros que se sumen después ya
    no lo reciben. Lo ya asignado a miembros existentes NO se toca."""
    company_service.require_company_org(
        db, company_service.resolve_company_id(actor, company_id), org_id
    )
    db.execute(
        sa_delete(OrgModuleAssignment).where(
            OrgModuleAssignment.org_id == org_id,
            OrgModuleAssignment.learning_unit_id == unit_id,
        )
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@admin_router.get(
    "/organizations/{org_id}/assignments-summary",
    response_model=list[OrgUnitAssignmentAggOut],
)
def org_assignments_summary(
    org_id: UUID,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ORG_ASSIGN_ROLES)),
) -> list[OrgUnitAssignmentAggOut]:
    """Qué se asignó en la organización, a cuántos y con qué estado agregado —
    vista para admin/company_admin (doc FASE 2.1 punto 3)."""
    company_service.require_company_org(
        db, company_service.resolve_company_id(actor, company_id), org_id
    )
    rows = db.execute(
        select(ModuleAssignment, LearningUnit, assignment_completed_clause())
        .join(LearningUnit, LearningUnit.id == ModuleAssignment.learning_unit_id)
        .where(ModuleAssignment.org_id == org_id)
    ).all()
    now = datetime.now(UTC)
    agg: dict[UUID, dict] = {}
    for a, u, is_done in rows:
        entry = agg.setdefault(
            u.id, {"unit_slug": u.slug, "unit_title": u.title, "assigned": 0, "completed": 0, "overdue": 0}
        )
        entry["assigned"] += 1
        if is_done:
            entry["completed"] += 1
        elif a.due_date is not None and a.due_date < now:
            entry["overdue"] += 1
    return [
        OrgUnitAssignmentAggOut(
            learning_unit_id=uid, unit_slug=v["unit_slug"], unit_title=v["unit_title"],
            assigned_count=v["assigned"], completed_count=v["completed"], overdue_count=v["overdue"],
        )
        for uid, v in agg.items()
    ]


def _get_assignment_or_404(db: Session, assignment_id: UUID, current_user: User) -> ModuleAssignment:
    if current_user.role not in _MANAGE_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient role")
    a = db.get(ModuleAssignment, assignment_id)  # sesión superadmin: frontera = _can_manage
    target = db.get(User, a.user_id) if a is not None else None
    if a is None or target is None or not _can_manage(current_user, target):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="assignment not found")
    return a


@admin_router.patch("/assignments/{assignment_id}", response_model=ModuleAssignmentOut)
def update_assignment(
    assignment_id: UUID,
    body: UpdateAssignmentRequest,
    db: Session = Depends(get_db_as_superadmin),
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
    db: Session = Depends(get_db_as_superadmin),
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
