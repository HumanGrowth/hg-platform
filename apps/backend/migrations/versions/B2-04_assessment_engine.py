"""B2-04 assessment engine — instruments, items, sessions, responses, results

Reemplaza los drafts de assessment (B1-03: assessment_questions/options/attempts/
answers) y el draft de user_learning_profiles por el motor productivo (B2-02):
catálogo global (instruments/items/options, sin RLS) + tablas por-user con RLS
(sessions, responses, pillar_results, user_learning_profiles). Tablas draft vacías
→ DROP IF EXISTS CASCADE es seguro (mismo patrón que B2-03).

Revision ID: e3040a1b2c50
Revises: d2030e6f2b51
Create Date: 2026-06-20 10:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "e3040a1b2c50"
down_revision: str | None = "d2030e6f2b51"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

PILLAR = ("P1", "P2", "P3", "P4", "P5", "P6A", "P6B")
INSTRUMENT = (
    "PMM_V3", "MLQ_10", "UCLA_3", "CACIOPPO_5", "PROCHASKA",
    "ERQ_10", "AAQ_II", "CD_RISC_10", "CFPB_5",
)
RESPONSE_TYPE = ("likert_1_5", "likert_1_7", "likert_0_4", "multiple_choice")
SESSION_KIND = ("onboarding_short", "pillar_detail")
SESSION_STATUS = ("in_progress", "completed", "expired", "abandoned")
RESULT_SOURCE = ("preliminary", "confirmed")

_RLS_TABLES = (
    "assessment_sessions",
    "assessment_responses",
    "pillar_results",
    "user_learning_profiles",
)
_ALL_TABLES = (
    "assessment_instruments",
    "assessment_items",
    "assessment_item_options",
    *_RLS_TABLES,
)


def upgrade() -> None:
    bind = op.get_bind()

    # Drop drafts (B1-03) vacíos.
    for t in ("assessment_answers", "assessment_attempts", "assessment_options",
              "assessment_questions", "user_learning_profiles"):
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    op.execute("DROP TYPE IF EXISTS assessment_type CASCADE")

    # Enums (crear una vez; reusar con create_type=False en columnas).
    pillar = postgresql.ENUM(*PILLAR, name="pillar_code")
    instrument = postgresql.ENUM(*INSTRUMENT, name="instrument_code")
    rtype = postgresql.ENUM(*RESPONSE_TYPE, name="response_type_enum")
    skind = postgresql.ENUM(*SESSION_KIND, name="session_kind")
    sstatus = postgresql.ENUM(*SESSION_STATUS, name="session_status")
    rsource = postgresql.ENUM(*RESULT_SOURCE, name="result_source")
    for e in (pillar, instrument, rtype, skind, sstatus, rsource):
        e.create(bind, checkfirst=True)

    def pillar_col(col_name: str = "pillar_code", **kw):
        return sa.Column(col_name, postgresql.ENUM(name="pillar_code", create_type=False), **kw)

    # ── Catálogo global (sin RLS) ──
    op.create_table(
        "assessment_instruments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("code", postgresql.ENUM(name="instrument_code", create_type=False), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        pillar_col(nullable=False),
        sa.Column("description", sa.String(length=2000), nullable=True),
        sa.Column("author", sa.String(length=120), nullable=True),
        sa.Column("validation_notes", sa.String(length=2000), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("code", name="uq_instrument_code"),
    )

    op.create_table(
        "assessment_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("instrument_id", sa.UUID(), nullable=False),
        pillar_col(nullable=False),
        sa.Column("item_code", sa.String(length=20), nullable=False),
        sa.Column("sub_scale", sa.String(length=40), nullable=True),
        sa.Column("sub_domain", sa.String(length=40), nullable=True),
        sa.Column("response_type", postgresql.ENUM(name="response_type_enum", create_type=False), nullable=False),
        sa.Column("scale_min", sa.Integer(), nullable=True),
        sa.Column("scale_max", sa.Integer(), nullable=True),
        sa.Column("reverse_scored", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("short_subset", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.String(length=500), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.ForeignKeyConstraint(["instrument_id"], ["assessment_instruments.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("item_code", name="uq_assessment_item_code"),
    )
    op.create_index(op.f("ix_assessment_items_instrument_id"), "assessment_items", ["instrument_id"])
    op.create_index(op.f("ix_assessment_items_pillar_code"), "assessment_items", ["pillar_code"])

    op.create_table(
        "assessment_item_options",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("item_id", sa.UUID(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False),
        sa.Column("label", sa.String(length=500), nullable=False),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("state_mapped", sa.String(length=40), nullable=True),
        sa.ForeignKeyConstraint(["item_id"], ["assessment_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessment_item_options_item_id"), "assessment_item_options", ["item_id"])

    # ── Por user (RLS) ──
    op.create_table(
        "assessment_sessions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("kind", postgresql.ENUM(name="session_kind", create_type=False), nullable=False),
        pillar_col("target_pillar", nullable=True),
        sa.Column("status", postgresql.ENUM(name="session_status", create_type=False),
                  server_default=sa.text("'in_progress'"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_assessment_sessions_org_id"), "assessment_sessions", ["org_id"])
    op.create_index(op.f("ix_assessment_sessions_user_id"), "assessment_sessions", ["user_id"])
    op.create_index(op.f("ix_assessment_sessions_target_pillar"), "assessment_sessions", ["target_pillar"])
    op.create_index(op.f("ix_assessment_sessions_status"), "assessment_sessions", ["status"])

    op.create_table(
        "assessment_responses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("item_id", sa.UUID(), nullable=False),
        sa.Column("response_value", sa.Integer(), nullable=False),
        sa.Column("qualitative_text", sa.String(length=4000), nullable=True),
        sa.Column("response_time_ms", sa.Integer(), nullable=True),
        sa.Column("presentation_mode", sa.String(length=20), server_default=sa.text("'traditional'"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["assessment_sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["item_id"], ["assessment_items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "item_id", name="uq_response_session_item"),
    )
    op.create_index(op.f("ix_assessment_responses_org_id"), "assessment_responses", ["org_id"])
    op.create_index(op.f("ix_assessment_responses_session_id"), "assessment_responses", ["session_id"])
    op.create_index(op.f("ix_assessment_responses_item_id"), "assessment_responses", ["item_id"])

    op.create_table(
        "pillar_results",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        pillar_col(nullable=False),
        sa.Column("source", postgresql.ENUM(name="result_source", create_type=False),
                  server_default=sa.text("'preliminary'"), nullable=False),
        sa.Column("state_code", sa.String(length=20), nullable=False),
        sa.Column("state_label", sa.String(length=120), nullable=False),
        sa.Column("sub_scores", postgresql.JSONB(), server_default=sa.text("'{}'"), nullable=False),
        sa.Column("requires_user_confirmation", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("user_confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("recaida_detected", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("suggested_next_step", sa.String(length=2000), nullable=True),
        sa.Column("derived_from_session_id", sa.UUID(), nullable=True),
        sa.Column("derived_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("next_retake_eligible_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["derived_from_session_id"], ["assessment_sessions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pillar_results_org_id"), "pillar_results", ["org_id"])
    op.create_index(op.f("ix_pillar_results_user_id"), "pillar_results", ["user_id"])
    op.create_index(op.f("ix_pillar_results_pillar_code"), "pillar_results", ["pillar_code"])

    op.create_table(
        "user_learning_profiles",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("pillar_states", postgresql.JSONB(), server_default=sa.text("'{}'"), nullable=False),
        sa.Column("onboarding_short_completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_assessment_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_learning_profile_user"),
    )
    op.create_index(op.f("ix_user_learning_profiles_org_id"), "user_learning_profiles", ["org_id"])

    # ── RLS en tablas por-user ──
    for t in _RLS_TABLES:
        op.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {t} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {t} "
            "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
            "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
        )

    # ── Grants ──
    for t in _ALL_TABLES:
        op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {t} TO hg_app, hg_superadmin")


def downgrade() -> None:
    for t in _ALL_TABLES:
        op.execute(f"DROP TABLE IF EXISTS {t} CASCADE")
    for name in ("pillar_code", "instrument_code", "response_type_enum",
                 "session_kind", "session_status", "result_source"):
        op.execute(f"DROP TYPE IF EXISTS {name} CASCADE")
