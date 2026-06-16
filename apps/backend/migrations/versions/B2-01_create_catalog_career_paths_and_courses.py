"""B2-01 create catalog: career_paths + courses + extend users.career_level

Catálogo PMM v3 productivo, **global al producto** (sin org_id ni RLS): los
cursos son contenido HG, no por organización. Crea sólo `career_paths` y
`courses` — Enrollment/CourseProgress/UserLearningProfile son B2-08.

También extiende el enum `career_level` (tabla users) con L5/L6 sin destruir
los deprecados L4a/L4b.

Revision ID: b2010c4a7f31
Revises: a1c7e2f4b8d0
Create Date: 2026-06-16 16:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "b2010c4a7f31"
down_revision: str | None = "a1c7e2f4b8d0"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

career_level_pmm = postgresql.ENUM(
    "L1", "L2", "L3", "L4", "L5", "L6", name="career_level_pmm"
)
competency_code = postgresql.ENUM("C1", "C2", "C3", "C4", "C5", name="competency_code")
course_track = postgresql.ENUM(
    "competency", "foundation_ai", "foundation_eth", "foundation_specifics", name="course_track"
)


def upgrade() -> None:
    bind = op.get_bind()

    # 1. Enums del catálogo PMM (distintos del enum `career_level` de users).
    career_level_pmm.create(bind, checkfirst=True)
    competency_code.create(bind, checkfirst=True)
    course_track.create(bind, checkfirst=True)

    # 2. career_paths — los 6 pilares del Marco Teórico (global, sin RLS).
    op.create_table(
        "career_paths",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_career_paths_code"),
    )

    # 3. courses — unidades de micro-learning (sub-clasificación PMM).
    op.create_table(
        "courses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("career_path_id", sa.UUID(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=255), nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("video_url", sa.String(length=2048), nullable=True),
        sa.Column("hls_master_url", sa.String(length=2048), nullable=True),
        sa.Column("thumbnail_url", sa.String(length=2048), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column(
            "career_level",
            postgresql.ENUM(name="career_level_pmm", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "competency_code",
            postgresql.ENUM(name="competency_code", create_type=False),
            nullable=True,
        ),
        sa.Column(
            "track",
            postgresql.ENUM(name="course_track", create_type=False),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["career_path_id"], ["career_paths.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug", name="uq_courses_slug"),
    )
    op.create_index(op.f("ix_courses_career_path_id"), "courses", ["career_path_id"])
    op.create_index(op.f("ix_courses_career_level"), "courses", ["career_level"])
    op.create_index(op.f("ix_courses_competency_code"), "courses", ["competency_code"])
    op.create_index(op.f("ix_courses_track"), "courses", ["track"])
    op.create_index(op.f("ix_courses_is_active"), "courses", ["is_active"])

    # 4. Catálogo global → la app (hg_app) y superadmin pueden leer/escribir.
    #    Sin RLS: no son datos por tenant.
    op.execute("GRANT SELECT, INSERT, UPDATE ON career_paths TO hg_app, hg_superadmin")
    op.execute("GRANT SELECT, INSERT, UPDATE ON courses TO hg_app, hg_superadmin")

    # 5. Extender el enum `career_level` de users con L5/L6 (no tocar L4a/L4b).
    #    PG16 permite ADD VALUE dentro de transacción (no se usa el valor acá).
    op.execute("ALTER TYPE career_level ADD VALUE IF NOT EXISTS 'L5'")
    op.execute("ALTER TYPE career_level ADD VALUE IF NOT EXISTS 'L6'")


def downgrade() -> None:
    op.drop_index(op.f("ix_courses_is_active"), table_name="courses")
    op.drop_index(op.f("ix_courses_track"), table_name="courses")
    op.drop_index(op.f("ix_courses_competency_code"), table_name="courses")
    op.drop_index(op.f("ix_courses_career_level"), table_name="courses")
    op.drop_index(op.f("ix_courses_career_path_id"), table_name="courses")
    op.drop_table("courses")
    op.drop_table("career_paths")

    bind = op.get_bind()
    course_track.drop(bind, checkfirst=True)
    competency_code.drop(bind, checkfirst=True)
    career_level_pmm.drop(bind, checkfirst=True)

    # PostgreSQL < 14 no soporta quitar valores de un enum (ALTER TYPE ... DROP
    # VALUE no existe). L5/L6 quedan en el enum `career_level`; es inocuo
    # (valores no usados). No se intenta removerlos para no romper el downgrade.