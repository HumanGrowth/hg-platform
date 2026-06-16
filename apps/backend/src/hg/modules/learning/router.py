"""Catalog router: career paths + courses (PMM v3).

Catálogo **global** (no multi-tenant): se sirve a cualquier usuario autenticado.
Las queries corren bajo ``hg_superadmin`` (no hay RLS sobre estas tablas); la
autenticación la impone ``get_current_user`` (token válido). GETs cacheables.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from hg.core.deps import get_current_user, get_db_as_superadmin
from hg.modules.identity.models import User
from hg.modules.learning.models import CareerPath, Course
from hg.modules.learning.schemas import CareerPathOut, CourseListResponse, CourseOut

router = APIRouter()

_CACHE = "public, max-age=60"


@router.get("/paths", response_model=list[CareerPathOut])
def list_paths(
    response: Response,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(get_current_user),
) -> list[CareerPath]:
    response.headers["Cache-Control"] = _CACHE
    return list(db.scalars(select(CareerPath).order_by(CareerPath.order_index)).all())


@router.get("/paths/{code}", response_model=CareerPathOut)
def get_path(
    code: str,
    response: Response,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(get_current_user),
) -> CareerPath:
    response.headers["Cache-Control"] = _CACHE
    path = db.scalar(select(CareerPath).where(CareerPath.code == code))
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="path not found")
    return path


def _filtered_courses(
    db: Session,
    *,
    career_path_id: UUID | None = None,
    level: str | None,
    competency: str | None,
    track: str | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Course], int]:
    conds: list[ColumnElement[bool]] = [Course.is_active.is_(True)]
    if career_path_id is not None:
        conds.append(Course.career_path_id == career_path_id)
    if level:
        conds.append(Course.career_level == level)
    if competency:
        conds.append(Course.competency_code == competency)
    if track:
        conds.append(Course.track == track)
    if q:
        conds.append(Course.title.ilike(f"%{q}%"))

    total = db.scalar(select(func.count()).select_from(Course).where(*conds)) or 0
    rows = db.scalars(
        select(Course)
        .where(*conds)
        .order_by(Course.career_level, Course.competency_code, Course.order_index)
        .limit(limit)
        .offset(offset)
    ).all()
    return list(rows), total


@router.get("/paths/{code}/courses", response_model=CourseListResponse)
def list_path_courses(
    code: str,
    response: Response,
    level: str | None = Query(default=None),
    competency: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(get_current_user),
) -> CourseListResponse:
    response.headers["Cache-Control"] = _CACHE
    path = db.scalar(select(CareerPath).where(CareerPath.code == code))
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="path not found")
    rows, total = _filtered_courses(
        db,
        career_path_id=path.id,
        level=level,
        competency=competency,
        track=None,
        q=None,
        limit=limit,
        offset=offset,
    )
    return CourseListResponse(items=[CourseOut.model_validate(r) for r in rows], total=total)


@router.get("/courses", response_model=CourseListResponse)
def list_courses(
    response: Response,
    level: str | None = Query(default=None),
    competency: str | None = Query(default=None),
    track: str | None = Query(default=None),
    q: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(get_current_user),
) -> CourseListResponse:
    response.headers["Cache-Control"] = _CACHE
    rows, total = _filtered_courses(
        db,
        level=level,
        competency=competency,
        track=track,
        q=q,
        limit=limit,
        offset=offset,
    )
    return CourseListResponse(items=[CourseOut.model_validate(r) for r in rows], total=total)
