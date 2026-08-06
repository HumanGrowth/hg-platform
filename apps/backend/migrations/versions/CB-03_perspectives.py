"""CB-03 perspectives CMS (schema polimórfico · 4 content types)

Contenido público de marketing: sin RLS ni org. Solo superadmin edita.

Revision ID: cb03perspectiv1
Revises: cb02savedtips1
Create Date: 2026-08-06 10:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "cb03perspectiv1"
down_revision: str | None = "cb02savedtips1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "perspective_posts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("content_type", sa.String(length=20), nullable=False),
        sa.Column("title", sa.String(length=300), nullable=False),
        sa.Column("subtitle", sa.String(length=500), nullable=True),
        sa.Column("cover_image_url", sa.String(length=2048), nullable=True),
        sa.Column("pillar_code", sa.String(length=10), nullable=True),
        sa.Column("author_name", sa.String(length=200), nullable=True),
        sa.Column("author_avatar_url", sa.String(length=2048), nullable=True),
        sa.Column("tags", sa.ARRAY(sa.String()), server_default="{}", nullable=False),
        sa.Column("body_markdown", sa.Text(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_perspective_posts_slug"),
        sa.CheckConstraint(
            "content_type IN ('blog','article','business_case','whitepaper')",
            name="ck_perspective_content_type",
        ),
    )
    op.create_index(op.f("ix_perspective_posts_slug"), "perspective_posts", ["slug"])
    op.create_index(op.f("ix_perspective_posts_content_type"), "perspective_posts", ["content_type"])
    op.create_index(op.f("ix_perspective_posts_pillar_code"), "perspective_posts", ["pillar_code"])
    op.create_index(
        "ix_perspective_posts_feed", "perspective_posts", ["content_type", sa.text("published_at DESC")],
        postgresql_where=sa.text("published_at IS NOT NULL"),
    )

    for name, extra in (
        ("perspective_articles", [sa.Column("read_minutes_estimated", sa.Integer(), nullable=True)]),
        ("perspective_business_cases", [
            sa.Column("org_client_name", sa.String(length=200), nullable=True),
            sa.Column("industry", sa.String(length=120), nullable=True),
            sa.Column("challenge", sa.Text(), nullable=True),
            sa.Column("solution", sa.Text(), nullable=True),
            sa.Column("metrics", sa.dialects.postgresql.JSONB(), server_default="[]", nullable=False),
        ]),
        ("perspective_whitepapers", [
            sa.Column("pdf_url", sa.String(length=2048), nullable=True),
            sa.Column("abstract", sa.Text(), nullable=True),
            sa.Column("download_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("gated_email_required", sa.Boolean(), server_default="false", nullable=False),
        ]),
    ):
        op.create_table(
            name,
            sa.Column("post_id", sa.UUID(), nullable=False),
            *extra,
            sa.ForeignKeyConstraint(["post_id"], ["perspective_posts.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("post_id"),
        )

    for t in ("perspective_posts", "perspective_articles", "perspective_business_cases", "perspective_whitepapers"):
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {t} TO hg_app, hg_superadmin")


def downgrade() -> None:
    op.drop_table("perspective_whitepapers")
    op.drop_table("perspective_business_cases")
    op.drop_table("perspective_articles")
    op.drop_index("ix_perspective_posts_feed", table_name="perspective_posts")
    op.drop_index(op.f("ix_perspective_posts_pillar_code"), table_name="perspective_posts")
    op.drop_index(op.f("ix_perspective_posts_content_type"), table_name="perspective_posts")
    op.drop_index(op.f("ix_perspective_posts_slug"), table_name="perspective_posts")
    op.drop_table("perspective_posts")
