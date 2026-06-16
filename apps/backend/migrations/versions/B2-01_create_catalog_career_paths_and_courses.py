"""B2-01 catalog PMM: extend courses + enums + extend users.career_level

`career_paths` y `courses` ya existen desde B1-03 (esquema draft). Esta migración
los vuelve **productivos**: agrega a `courses` las columnas PMM (slug, hls,
career_level, competency_code, track), hace `video_url` nullable, crea índices y
grants. El catálogo es global (sin org_id ni RLS).

También extiende el enum `career_level` (tabla users) con L5/L6 sin destruir los
deprecados L4a/L4b. NO crea enrollments/course_progress/user_learning_profiles
(ya existen desde B1-03; quedan draft hasta B2-08).

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

    # 2. courses ya existe (B1-03). Agregar columnas PMM. La tabla no tiene datos
    #    productivos todavía, así que los NOT NULL se aplican sin backfill.
    op.add_column("courses", sa.Column("slug", sa.String(length=255), nullable=True))
    op.add_column("courses", sa.Column("hls_master_url", sa.String(length=2048), nullable=True))
    op.add_column(
        "courses",
        sa.Column("career_level", postgresql.ENUM(name="career_level_pmm", create_type=False), nullable=True),
    )
    op.add_column(
        "courses",
        sa.Column("competency_code", postgresql.ENUM(name="competency_code", create_type=False), nullable=True),
    )
    op.add_column(
        "courses",
        sa.Column(
            "track",
            postgresql.ENUM(name="course_track", create_type=False),
            nullable=False,
            server_default="competency",
        ),
    )
    # video_url pasa a nullable (el player usa hls_master_url).
    op.alter_column("courses", "video_url", existing_type=sa.String(length=2048), nullable=True)
    # slug y career_level a NOT NULL (tabla vacía).
    op.alter_column("courses", "slug", existing_type=sa.String(length=255), nullable=False)
    op.alter_column(
        "courses",
        "career_level",
        existing_type=postgresql.ENUM(name="career_level_pmm", create_type=False),
        nullable=False,
    )
    op.create_unique_constraint("uq_courses_slug", "courses", ["slug"])
    op.create_index(op.f("ix_courses_career_level"), "courses", ["career_level"])
    op.create_index(op.f("ix_courses_competency_code"), "courses", ["competency_code"])
    op.create_index(op.f("ix_courses_track"), "courses", ["track"])
    op.create_index(op.f("ix_courses_is_active"), "courses", ["is_active"])
    # ix_courses_career_path_id ya existe (B1-03).

    # 3. Catálogo global → grants para la app (sin RLS).
    op.execute("GRANT SELECT, INSERT, UPDATE ON career_paths TO hg_app, hg_superadmin")
    op.execute("GRANT SELECT, INSERT, UPDATE ON courses TO hg_app, hg_superadmin")

    # 4. Extender el enum `career_level` de users con L5/L6 (no tocar L4a/L4b).
    op.execute("ALTER TYPE career_level ADD VALUE IF NOT EXISTS 'L5'")
    op.execute("ALTER TYPE career_level ADD VALUE IF NOT EXISTS 'L6'")


def downgrade() -> None:
    op.drop_index(op.f("ix_courses_is_active"), table_name="courses")
    op.drop_index(op.f("ix_courses_track"), table_name="courses")
    op.drop_index(op.f("ix_courses_competency_code"), table_name="courses")
    op.drop_index(op.f("ix_courses_career_level"), table_name="courses")
    op.drop_constraint("uq_courses_slug", "courses", type_="unique")
    op.alter_column("courses", "video_url", existing_type=sa.String(length=2048), nullable=False)
    op.drop_column("courses", "track")
    op.drop_column("courses", "competency_code")
    op.drop_column("courses", "career_level")
    op.drop_column("courses", "hls_master_url")
    op.drop_column("courses", "slug")

    bind = op.get_bind()
    course_track.drop(bind, checkfirst=True)
    competency_code.drop(bind, checkfirst=True)
    career_level_pmm.drop(bind, checkfirst=True)

    # PostgreSQL no soporta quitar valores de un enum: L5/L6 quedan en
    # `career_level` (inocuo, valores no usados).
