"""Pydantic schemas de Perspectivas CMS (cierre-beta TASK 1-CMS)."""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

ContentType = Literal["blog", "article", "business_case", "whitepaper"]


class ArticleExt(BaseModel):
    read_minutes_estimated: int | None = None


class BusinessCaseExt(BaseModel):
    org_client_name: str | None = None
    industry: str | None = None
    challenge: str | None = None
    solution: str | None = None
    metrics: list = Field(default_factory=list)


class WhitepaperExt(BaseModel):
    pdf_url: str | None = None
    abstract: str | None = None
    download_count: int = 0
    gated_email_required: bool = False


class PerspectiveSummary(BaseModel):
    id: UUID
    slug: str
    content_type: ContentType
    title: str
    subtitle: str | None
    cover_image_url: str | None
    dimension_code: str | None
    author_name: str | None
    tags: list[str]
    published_at: datetime | None
    read_minutes_estimated: int | None = None


class PerspectiveDetail(PerspectiveSummary):
    author_avatar_url: str | None
    body_markdown: str | None
    updated_at: datetime
    created_at: datetime
    article: ArticleExt | None = None
    business_case: BusinessCaseExt | None = None
    whitepaper: WhitepaperExt | None = None


class PerspectiveListResponse(BaseModel):
    items: list[PerspectiveSummary]
    total: int


class CreatePostRequest(BaseModel):
    content_type: ContentType
    title: str = Field(min_length=1, max_length=300)
    slug: str | None = Field(default=None, max_length=200)
    subtitle: str | None = Field(default=None, max_length=500)
    cover_image_url: str | None = None
    dimension_code: str | None = Field(default=None, max_length=10)
    author_name: str | None = Field(default=None, max_length=200)
    author_avatar_url: str | None = None
    tags: list[str] = Field(default_factory=list)
    body_markdown: str | None = None
    read_minutes_estimated: int | None = None  # solo article
    # Business case
    org_client_name: str | None = None
    industry: str | None = None
    challenge: str | None = None
    solution: str | None = None
    metrics: list | None = None
    # Whitepaper
    pdf_url: str | None = None
    abstract: str | None = None
    gated_email_required: bool | None = None


class UpdatePostRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=300)
    slug: str | None = Field(default=None, max_length=200)
    subtitle: str | None = Field(default=None, max_length=500)
    cover_image_url: str | None = None
    dimension_code: str | None = Field(default=None, max_length=10)
    author_name: str | None = Field(default=None, max_length=200)
    author_avatar_url: str | None = None
    tags: list[str] | None = None
    body_markdown: str | None = None
    read_minutes_estimated: int | None = None
    org_client_name: str | None = None
    industry: str | None = None
    challenge: str | None = None
    solution: str | None = None
    metrics: list | None = None
    pdf_url: str | None = None
    abstract: str | None = None
    gated_email_required: bool | None = None
