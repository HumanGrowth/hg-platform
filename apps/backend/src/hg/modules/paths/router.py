"""CRUD de rutas customizables por Empresa/Organización (FASE 2.2).

Todo bajo ``get_db_as_superadmin`` (BYPASSRLS, cross-tenant) + ``require_role``
+ un filtro duro por ``company_id`` en cada handler — mismo patrón que
``company/router.py`` (``custom_paths`` no tiene RLS, ver
``paths/models.py``). Simetría deliberada con ``company_admin``: este plan no
distingue "admin dentro de su org" de "company_admin dentro de su empresa"
porque ningún otro endpoint de la app lo hace tampoco (`company/router.py`
trata "admin" y "company_admin" igual, ambos resueltos a su Empresa vía
``resolve_company_id``).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import delete as sa_delete
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.company import service as company_service
from hg.modules.identity.models import Organization, User
from hg.modules.learning_units.area_access import enabled_area_codes
from hg.modules.learning_units.models import LearningUnit
from hg.modules.paths.models import (
    CustomPath,
    CustomPathAssignment,
    CustomPathItem,
    CustomPathScope,
)
from hg.modules.paths.resolution import resolve_custom_path
from hg.modules.paths.schemas import (
    CreateCustomPathRequest,
    CustomPathItemOut,
    CustomPathOut,
    ResolvedCustomPathOut,
    SetCustomPathAssignmentsRequest,
    SetCustomPathItemsRequest,
    UpdateCustomPathRequest,
)

router = APIRouter()

_ROLES = ("admin", "company_admin", "superadmin")


def _serialize(db: Session, cp: CustomPath) -> CustomPathOut:
    items = list(
        db.execute(
            select(CustomPathItem, LearningUnit)
            .join(LearningUnit, LearningUnit.id == CustomPathItem.learning_unit_id)
            .where(CustomPathItem.custom_path_id == cp.id)
            .order_by(CustomPathItem.order_index)
        ).all()
    )
    org = db.get(Organization, cp.org_id) if cp.org_id else None
    assigned_count = (
        db.scalar(
            select(func.count()).select_from(CustomPathAssignment).where(
                CustomPathAssignment.custom_path_id == cp.id
            )
        )
        or 0
    )
    return CustomPathOut(
        id=cp.id, name=cp.name, description=cp.description, scope=cp.scope,
        company_id=cp.company_id, org_id=cp.org_id, org_name=org.name if org else None,
        is_active=cp.is_active, created_at=cp.created_at, updated_at=cp.updated_at,
        assigned_member_count=int(assigned_count),
        items=[
            CustomPathItemOut(
                id=item.id, learning_unit_id=item.learning_unit_id,
                unit_slug=unit.slug, unit_title=unit.title,
                order_index=item.order_index, is_required=item.is_required,
            )
            for item, unit in items
        ],
    )


def _get_or_404(db: Session, company_id: UUID, custom_path_id: UUID) -> CustomPath:
    cp = db.get(CustomPath, custom_path_id)
    if cp is None or cp.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="custom path not found")
    return cp


@router.get("/custom-paths", response_model=list[CustomPathOut])
def list_custom_paths(
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    org_id: UUID | None = Query(default=None),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> list[CustomPathOut]:
    """Rutas de la Empresa; con ``org_id``, solo las aplicables a esa org
    (su propio ``scope=org`` + todo ``scope=company`` de su Empresa)."""
    resolved_company = company_service.resolve_company_id(actor, company_id)
    if org_id is not None:
        company_service.require_company_org(db, resolved_company, org_id)
        stmt = select(CustomPath).where(
            CustomPath.company_id == resolved_company,
            (CustomPath.scope == CustomPathScope.company) | (CustomPath.org_id == org_id),
        )
    else:
        stmt = select(CustomPath).where(CustomPath.company_id == resolved_company)
    rows = db.scalars(stmt.order_by(CustomPath.created_at.desc())).all()
    return [_serialize(db, cp) for cp in rows]


@router.post("/custom-paths", response_model=CustomPathOut, status_code=status.HTTP_201_CREATED)
def create_custom_path(
    body: CreateCustomPathRequest,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> CustomPathOut:
    resolved_company = company_service.resolve_company_id(actor, company_id)
    if body.scope == CustomPathScope.org:
        if body.org_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="org_id es requerido para scope=org",
            )
        company_service.require_company_org(db, resolved_company, body.org_id)
    cp = CustomPath(
        name=body.name, description=body.description, scope=body.scope,
        company_id=resolved_company, org_id=body.org_id if body.scope == CustomPathScope.org else None,
        created_by_user_id=actor.id,
    )
    db.add(cp)
    db.flush()
    return _serialize(db, cp)


@router.patch("/custom-paths/{custom_path_id}", response_model=CustomPathOut)
def update_custom_path(
    custom_path_id: UUID,
    body: UpdateCustomPathRequest,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> CustomPathOut:
    cp = _get_or_404(db, company_service.resolve_company_id(actor, company_id), custom_path_id)
    if body.name is not None:
        cp.name = body.name
    if body.description is not None:
        cp.description = body.description
    if body.is_active is not None:
        cp.is_active = body.is_active
    db.flush()
    return _serialize(db, cp)


@router.delete("/custom-paths/{custom_path_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_custom_path(
    custom_path_id: UUID,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> None:
    cp = _get_or_404(db, company_service.resolve_company_id(actor, company_id), custom_path_id)
    db.delete(cp)
    db.flush()


@router.put("/custom-paths/{custom_path_id}/items", response_model=CustomPathOut)
def set_custom_path_items(
    custom_path_id: UUID,
    body: SetCustomPathItemsRequest,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> CustomPathOut:
    resolved_company = company_service.resolve_company_id(actor, company_id)
    cp = _get_or_404(db, resolved_company, custom_path_id)

    unit_ids = [item.learning_unit_id for item in body.items]
    units = {
        u.id: u for u in db.scalars(select(LearningUnit).where(LearningUnit.id.in_(unit_ids))).all()
    }
    missing = set(unit_ids) - set(units)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"learning units inexistentes: {sorted(str(m) for m in missing)}",
        )
    enabled = enabled_area_codes(db, resolved_company)
    blocked = [
        units[uid].slug for uid in unit_ids
        if units[uid].area_code is not None and units[uid].area_code not in enabled
    ]
    if blocked:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Área no habilitada para la empresa: {sorted(blocked)}",
        )
    if len(set(unit_ids)) != len(unit_ids):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="learning units duplicadas"
        )

    db.execute(sa_delete(CustomPathItem).where(CustomPathItem.custom_path_id == cp.id))
    db.add_all(
        [
            CustomPathItem(
                custom_path_id=cp.id, learning_unit_id=item.learning_unit_id,
                order_index=idx, is_required=item.is_required,
            )
            for idx, item in enumerate(body.items)
        ]
    )
    db.flush()
    return _serialize(db, cp)


@router.put("/custom-paths/{custom_path_id}/assignments", response_model=CustomPathOut)
def set_custom_path_assignments(
    custom_path_id: UUID,
    body: SetCustomPathAssignmentsRequest,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> CustomPathOut:
    """Reemplaza el set de miembros puntuales asignados a esta ruta (3er
    mecanismo de targeting, gana precedencia sobre scope — ver
    ``paths/resolution.py``). Los miembros deben pertenecer a la Empresa."""
    resolved_company = company_service.resolve_company_id(actor, company_id)
    cp = _get_or_404(db, resolved_company, custom_path_id)

    members = {
        u.id: u for u in db.scalars(select(User).where(User.id.in_(body.user_ids))).all()
    }
    missing = set(body.user_ids) - set(members)
    if missing:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"usuarios inexistentes: {sorted(str(m) for m in missing)}",
        )
    outside = [str(uid) for uid, u in members.items() if u.company_id != resolved_company]
    if outside:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"usuarios fuera de la empresa: {sorted(outside)}",
        )

    db.execute(sa_delete(CustomPathAssignment).where(CustomPathAssignment.custom_path_id == cp.id))
    db.add_all(
        [
            CustomPathAssignment(
                org_id=members[uid].org_id, custom_path_id=cp.id, user_id=uid,
                assigned_by_user_id=actor.id,
            )
            for uid in body.user_ids
        ]
    )
    db.flush()
    return _serialize(db, cp)


@router.get("/users/{user_id}/custom-path", response_model=ResolvedCustomPathOut)
def get_resolved_custom_path(
    user_id: UUID,
    company_id: UUID | None = Query(default=None, description="solo superadmin"),
    db: Session = Depends(get_db_as_superadmin),
    actor: User = Depends(require_role(*_ROLES)),
) -> ResolvedCustomPathOut:
    """La ruta custom EFECTIVA para un colaborador (tras precedencia
    asignación > org > empresa) — vista de diagnóstico para admin/company_admin."""
    user = company_service.require_company_member(
        db, company_service.resolve_company_id(actor, company_id), user_id
    )
    cp = resolve_custom_path(db, user)
    return ResolvedCustomPathOut(
        custom_path_id=cp.id if cp else None, custom_path_name=cp.name if cp else None
    )
