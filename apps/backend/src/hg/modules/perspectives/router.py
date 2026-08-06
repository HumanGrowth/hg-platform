"""Perspectivas CMS — endpoints públicos (lectura) + admin (CRUD superadmin).

Corre bajo hg_superadmin (contenido público sin RLS; el filtro published_at
protege lo no publicado en las rutas públicas). Usa flush() — no commit a mitad
del handler (regla del P0 #57); get_db_as_superadmin commitea al final.
"""
from __future__ import annotations

import re
import unicodedata
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.identity.models import User
from hg.modules.perspectives.models import (
    PerspectiveArticle,
    PerspectiveBusinessCase,
    PerspectivePost,
    PerspectiveWhitepaper,
)
from hg.modules.perspectives.schemas import (
    ArticleExt,
    BusinessCaseExt,
    CreatePostRequest,
    PerspectiveDetail,
    PerspectiveListResponse,
    PerspectiveSummary,
    UpdatePostRequest,
    WhitepaperExt,
)

public_router = APIRouter()
admin_router = APIRouter()


def _slugify(text: str) -> str:
    norm = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", norm.lower()).strip("-")[:180] or "post"


def _unique_slug(db: Session, base: str, exclude_id: UUID | None = None) -> str:
    slug = base
    n = 1
    while True:
        q = select(PerspectivePost.id).where(PerspectivePost.slug == slug)
        if exclude_id:
            q = q.where(PerspectivePost.id != exclude_id)
        if db.scalar(q) is None:
            return slug
        n += 1
        slug = f"{base}-{n}"


def _summary(p: PerspectivePost) -> PerspectiveSummary:
    return PerspectiveSummary(
        id=p.id, slug=p.slug, content_type=p.content_type, title=p.title, subtitle=p.subtitle,
        cover_image_url=p.cover_image_url, pillar_code=p.pillar_code, author_name=p.author_name,
        tags=list(p.tags or []), published_at=p.published_at,
        read_minutes_estimated=p.article.read_minutes_estimated if p.article else None,
    )


def _detail(p: PerspectivePost) -> PerspectiveDetail:
    bc = p.business_case
    wp = p.whitepaper
    return PerspectiveDetail(
        **_summary(p).model_dump(),
        author_avatar_url=p.author_avatar_url, body_markdown=p.body_markdown,
        updated_at=p.updated_at, created_at=p.created_at,
        article=ArticleExt(read_minutes_estimated=p.article.read_minutes_estimated) if p.article else None,
        business_case=BusinessCaseExt(
            org_client_name=bc.org_client_name, industry=bc.industry, challenge=bc.challenge,
            solution=bc.solution, metrics=list(bc.metrics or []),
        ) if bc else None,
        whitepaper=WhitepaperExt(
            pdf_url=wp.pdf_url, abstract=wp.abstract, download_count=wp.download_count,
            gated_email_required=wp.gated_email_required,
        ) if wp else None,
    )


# ─────────────────────────── Público ───────────────────────────


@public_router.get("/perspectives", response_model=PerspectiveListResponse)
def list_published(
    content_type: str | None = None,
    pillar: str | None = None,
    q: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db_as_superadmin),
) -> PerspectiveListResponse:
    conds = [PerspectivePost.published_at.isnot(None), PerspectivePost.published_at <= func.now()]
    if content_type:
        conds.append(PerspectivePost.content_type == content_type)
    if pillar:
        conds.append(PerspectivePost.pillar_code == pillar)
    if q:
        like = f"%{q.lower()}%"
        conds.append(or_(
            func.lower(PerspectivePost.title).like(like),
            func.lower(func.coalesce(PerspectivePost.subtitle, "")).like(like),
        ))
    total = db.scalar(select(func.count()).select_from(PerspectivePost).where(*conds)) or 0
    rows = db.scalars(
        select(PerspectivePost).where(*conds)
        .order_by(PerspectivePost.published_at.desc()).offset(offset).limit(limit)
    ).all()
    return PerspectiveListResponse(items=[_summary(p) for p in rows], total=total)


@public_router.get("/perspectives/{slug}", response_model=PerspectiveDetail)
def get_published(slug: str, db: Session = Depends(get_db_as_superadmin)) -> PerspectiveDetail:
    p = db.scalar(
        select(PerspectivePost).where(
            PerspectivePost.slug == slug, PerspectivePost.published_at.isnot(None),
            PerspectivePost.published_at <= func.now(),
        )
    )
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="not found")
    return _detail(p)


# ─────────────────────────── Admin (superadmin) ───────────────────────────


def _post_or_404(db: Session, post_id: UUID) -> PerspectivePost:
    p = db.get(PerspectivePost, post_id)
    if p is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="post not found")
    return p


@admin_router.get("/perspectives", response_model=list[PerspectiveDetail])
def admin_list(
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> list[PerspectiveDetail]:
    rows = db.scalars(select(PerspectivePost).order_by(PerspectivePost.updated_at.desc())).all()
    return [_detail(p) for p in rows]


@admin_router.get("/perspectives/{post_id}", response_model=PerspectiveDetail)
def admin_detail(
    post_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> PerspectiveDetail:
    return _detail(_post_or_404(db, post_id))


@admin_router.post("/perspectives", response_model=PerspectiveDetail, status_code=status.HTTP_201_CREATED)
def admin_create(
    body: CreatePostRequest,
    db: Session = Depends(get_db_as_superadmin),
    user: User = Depends(require_role("superadmin")),
) -> PerspectiveDetail:
    slug = _unique_slug(db, _slugify(body.slug or body.title))
    post = PerspectivePost(
        id=uuid4(), slug=slug, content_type=body.content_type, title=body.title, subtitle=body.subtitle,
        cover_image_url=body.cover_image_url, pillar_code=body.pillar_code, author_name=body.author_name,
        author_avatar_url=body.author_avatar_url, tags=body.tags, body_markdown=body.body_markdown,
        created_by_user_id=user.id,
    )
    db.add(post)
    if body.content_type == "article":
        post.article = PerspectiveArticle(read_minutes_estimated=body.read_minutes_estimated)
    elif body.content_type == "business_case":
        post.business_case = PerspectiveBusinessCase(
            org_client_name=body.org_client_name, industry=body.industry, challenge=body.challenge,
            solution=body.solution, metrics=body.metrics or [],
        )
    elif body.content_type == "whitepaper":
        post.whitepaper = PerspectiveWhitepaper(
            pdf_url=body.pdf_url, abstract=body.abstract,
            gated_email_required=bool(body.gated_email_required),
        )
    db.flush()
    db.refresh(post)
    return _detail(post)


@admin_router.patch("/perspectives/{post_id}", response_model=PerspectiveDetail)
def admin_update(
    post_id: UUID,
    body: UpdatePostRequest,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> PerspectiveDetail:
    p = _post_or_404(db, post_id)
    data = body.model_dump(exclude_unset=True)
    if data.get("slug"):
        p.slug = _unique_slug(db, _slugify(data["slug"]), exclude_id=p.id)
    for field in ("title", "subtitle", "cover_image_url", "pillar_code", "author_name",
                  "author_avatar_url", "tags", "body_markdown"):
        if field in data:
            setattr(p, field, data[field])
    if "read_minutes_estimated" in data and p.content_type == "article":
        if p.article is None:
            p.article = PerspectiveArticle()
        p.article.read_minutes_estimated = data["read_minutes_estimated"]
    if p.content_type == "business_case":
        if p.business_case is None:
            p.business_case = PerspectiveBusinessCase()
        for f in ("org_client_name", "industry", "challenge", "solution", "metrics"):
            if f in data:
                setattr(p.business_case, f, data[f] if f != "metrics" else (data[f] or []))
    if p.content_type == "whitepaper":
        if p.whitepaper is None:
            p.whitepaper = PerspectiveWhitepaper()
        for f in ("pdf_url", "abstract", "gated_email_required"):
            if f in data:
                setattr(p.whitepaper, f, data[f])
    db.flush()
    db.refresh(p)
    return _detail(p)


@admin_router.post("/perspectives/{post_id}/publish", response_model=PerspectiveDetail)
def admin_publish(
    post_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> PerspectiveDetail:
    p = _post_or_404(db, post_id)
    if not p.title.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="título requerido")
    if p.content_type == "business_case" and not (
        p.business_case and (p.business_case.challenge or "").strip() and (p.business_case.solution or "").strip()
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un Business Case necesita 'desafío' y 'solución' para publicarse.",
        )
    if p.content_type == "whitepaper" and not (p.whitepaper and (p.whitepaper.pdf_url or "").strip()):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Un Whitepaper necesita el PDF para publicarse.",
        )
    p.published_at = func.now()
    db.flush()
    db.refresh(p)
    return _detail(p)


@admin_router.post("/perspectives/{post_id}/unpublish", response_model=PerspectiveDetail)
def admin_unpublish(
    post_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> PerspectiveDetail:
    p = _post_or_404(db, post_id)
    p.published_at = None
    db.flush()
    db.refresh(p)
    return _detail(p)


@admin_router.delete("/perspectives/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete(
    post_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> Response:
    p = _post_or_404(db, post_id)
    db.delete(p)
    db.flush()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
