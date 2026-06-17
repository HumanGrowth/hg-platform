"""Catalog router: career paths + courses (PMM v3).

Catálogo **global** (no multi-tenant): se sirve a cualquier usuario autenticado.
Las queries corren bajo ``hg_superadmin`` (no hay RLS sobre estas tablas); la
autenticación la impone ``get_current_user`` (token válido). GETs cacheables.
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement

from hg.core.deps import get_current_user, get_db_as_superadmin
from hg.db import get_db
from hg.modules.identity.models import User
from hg.modules.learning.models import CareerPath, Course, CourseProgress
from hg.modules.learning.schemas import (
    CareerPathOut,
    CourseDetailOut,
    CourseListResponse,
    CourseOut,
    CourseProgressIn,
    CourseProgressOut,
)

COMPLETION_THRESHOLD = 80.0

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


# ─────────────── Detalle + progreso (course_progress, RLS por org) ───────────────
# Usan get_db (hg_app + contexto de org via get_current_user) porque course_progress
# tiene RLS. Las courses (globales, sin RLS) son legibles bajo hg_app por el grant.


def _active_course_or_404(db: Session, slug: str) -> Course:
    course = db.scalar(select(Course).where(Course.slug == slug, Course.is_active.is_(True)))
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="course not found")
    return course


@router.get("/courses/{slug}", response_model=CourseDetailOut)
def get_course_detail(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseDetailOut:
    course = _active_course_or_404(db, slug)
    prog = db.scalar(
        select(CourseProgress).where(
            CourseProgress.course_id == course.id,
            CourseProgress.user_id == current_user.id,
        )
    )
    return CourseDetailOut(
        **CourseOut.model_validate(course).model_dump(),
        progress=CourseProgressOut.model_validate(prog) if prog else None,
    )


@router.post("/courses/{slug}/progress", response_model=CourseProgressOut)
def upsert_progress(
    slug: str,
    payload: CourseProgressIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CourseProgressOut:
    course = _active_course_or_404(db, slug)
    prog = db.scalar(
        select(CourseProgress).where(
            CourseProgress.course_id == course.id,
            CourseProgress.user_id == current_user.id,
        )
    )
    if prog is None:
        prog = CourseProgress(
            org_id=current_user.org_id,
            user_id=current_user.id,
            course_id=course.id,
            last_position_seconds=payload.position_seconds,
            watch_pct=payload.watch_pct,
        )
        db.add(prog)
    else:
        prog.last_position_seconds = payload.position_seconds
        prog.watch_pct = payload.watch_pct
    # Completion: marca una sola vez al cruzar el umbral; completed_at inmutable.
    if payload.watch_pct >= COMPLETION_THRESHOLD and not prog.is_completed:
        prog.is_completed = True
        prog.completed_at = datetime.now(UTC)
    db.flush()
    db.refresh(prog)
    return CourseProgressOut.model_validate(prog)


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
