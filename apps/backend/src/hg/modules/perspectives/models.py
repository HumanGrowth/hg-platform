"""Perspectivas CMS — schema polimórfico (cierre-beta TASK 1-CMS).

Cabecera común (`PerspectivePost`) + una tabla de extensión por content_type.
Contenido PÚBLICO de marketing: sin org_id ni RLS. Solo superadmin edita.

Fase 1: se crean las 4 tablas (schema completo), pero los endpoints/validaciones
priorizan Blog + Artículo. Business Case y Whitepaper quedan como TODO.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from hg.db import Base

CONTENT_TYPES = ("blog", "article", "business_case", "whitepaper")


class PerspectivePost(Base):
    __tablename__ = "perspective_posts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(500))
    cover_image_url: Mapped[str | None] = mapped_column(String(2048))
    # career_path code (P1..P6), opcional. Sin FK dura para no acoplar a la tabla.
    dimension_code: Mapped[str | None] = mapped_column(String(10), index=True)
    author_name: Mapped[str | None] = mapped_column(String(200))
    author_avatar_url: Mapped[str | None] = mapped_column(String(2048))
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), server_default="{}", nullable=False)
    body_markdown: Mapped[str | None] = mapped_column(Text)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))  # null = draft
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    created_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )

    article: Mapped[PerspectiveArticle | None] = relationship(
        "PerspectiveArticle", back_populates="post", uselist=False, cascade="all, delete-orphan"
    )
    business_case: Mapped[PerspectiveBusinessCase | None] = relationship(
        "PerspectiveBusinessCase", back_populates="post", uselist=False, cascade="all, delete-orphan"
    )
    whitepaper: Mapped[PerspectiveWhitepaper | None] = relationship(
        "PerspectiveWhitepaper", back_populates="post", uselist=False, cascade="all, delete-orphan"
    )


class PerspectiveArticle(Base):
    __tablename__ = "perspective_articles"
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("perspective_posts.id", ondelete="CASCADE"), primary_key=True
    )
    read_minutes_estimated: Mapped[int | None] = mapped_column(Integer)
    post: Mapped[PerspectivePost] = relationship("PerspectivePost", back_populates="article")


class PerspectiveBusinessCase(Base):
    __tablename__ = "perspective_business_cases"
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("perspective_posts.id", ondelete="CASCADE"), primary_key=True
    )
    org_client_name: Mapped[str | None] = mapped_column(String(200))
    industry: Mapped[str | None] = mapped_column(String(120))
    challenge: Mapped[str | None] = mapped_column(Text)
    solution: Mapped[str | None] = mapped_column(Text)
    metrics: Mapped[list] = mapped_column(JSONB, server_default="[]", nullable=False)
    post: Mapped[PerspectivePost] = relationship("PerspectivePost", back_populates="business_case")


class PerspectiveWhitepaper(Base):
    __tablename__ = "perspective_whitepapers"
    post_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("perspective_posts.id", ondelete="CASCADE"), primary_key=True
    )
    pdf_url: Mapped[str | None] = mapped_column(String(2048))
    abstract: Mapped[str | None] = mapped_column(Text)
    download_count: Mapped[int] = mapped_column(Integer, server_default="0", nullable=False)
    gated_email_required: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False)
    post: Mapped[PerspectivePost] = relationship("PerspectivePost", back_populates="whitepaper")
