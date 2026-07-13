"""LU-01 Learning Units v2 · rename courses→events + 18 new tables

Fase 1 de Learning Units v2 (docs/prompts/claude-code_learning_units_v2_fase1.md,
decisión D). Dos cosas en una migración:

1. **Rename `courses` → `events`** (preserva IDs y FKs — `ALTER TABLE ... RENAME`
   no toca constraints/índices/grants existentes, solo el nombre). Se agregan
   columnas nuevas (`event_type`, `is_preview`, `presenter_id`, `scheduled_at`)
   sin tocar ninguna columna existente. `course_progress.course_id` NO se toca
   (sigue apuntando a `events.id` vía el mismo FK constraint, ahora con el
   nombre de columna "viejo" — el rename de esa columna queda para Fase 2,
   documentado en el prompt).

2. **18 tablas nuevas** de Learning Units (contenido modular por bloques) +
   `event_streams` (live streaming futuro, sin uso en Fase 1).

Desviaciones deliberadas vs. el schema §5.2 de HG_Propuesta_Learning_Units_v2.md
(documentadas porque el doc fue escrito antes de conocer el schema real):

- **Enums en vez de CHECK constraints** para todo campo de tipo cerrado
  (`block_type`, `variant`, `question_type`, `scoring`, `status`,
  `event_type`, `provider`) — consistente con el resto del catálogo
  (`career_level_pmm`, `competency_code`, `course_track`, etc. ya usan
  `postgresql.ENUM`, no CHECK).
- **`learning_units.competency_code`** reusa el enum Postgres `competency_code`
  ya creado en B2-01 (no existe una tabla `competencies` en este codebase —
  el doc asumía una que nunca se construyó; los cursos ya usan el mismo
  patrón de enum en vez de FK a tabla).
- **`quiz_responses`** generalizado a `response_data JSONB` en vez de
  `selected_option_id UUID REFERENCES quiz_options(id)` — el doc originial
  solo modelaba single/multiple_choice, pero el schema real soporta 6 tipos
  de pregunta (true_false, ordering, matching, fill_blank no tienen una
  "opción seleccionada" simple). `is_correct` se sigue calculando y
  guardando en la columna dedicada.
- **RLS**: por regla dura del prompt, RLS por org solo aplica a
  `learning_unit_attempts` (progreso privado). Las 17 tablas de contenido
  (`learning_units` + bloques) son catálogo global — mismo patrón que
  `career_paths`/`courses` (grants directos a `hg_app`/`hg_superadmin`, sin
  `ENABLE ROW LEVEL SECURITY`). `block_progress`/`quiz_responses`/
  `reflection_texts` cuelgan de `learning_unit_attempts` por `attempt_id`
  pero NO llevan RLS propio (solo tienen `attempt_id`, no `org_id` — filtrar
  por org requeriría un JOIN dentro de la policy); el aislamiento de esas
  tres tablas lo impone el router verificando `attempt.user_id ==
  current_user.id` antes de tocarlas (documentado en A-04).

Revision ID: 04c4e56f592e
Revises: e3040a1b2c50
Create Date: 2026-07-13 00:00:00.000000

"""
from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "04c4e56f592e"
down_revision: str | None = "e3040a1b2c50"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# ─────────────────────────── Enums ───────────────────────────

event_type_enum = postgresql.ENUM(
    "live_webinar", "recorded_webinar", "masterclass_live", "masterclass_replay",
    name="event_type",
)
event_stream_provider_enum = postgresql.ENUM("youtube", "mux", "livekit", name="event_stream_provider")
unit_block_type_enum = postgresql.ENUM(
    "video_intro", "video_teaching", "video_closing",
    "text_context", "text_evidence", "text_solution",
    "quiz_recall", "reflection_write",
    name="unit_block_type",
)
text_block_variant_enum = postgresql.ENUM("context", "evidence", "solution", name="text_block_variant")
quiz_question_type_enum = postgresql.ENUM(
    "single_choice", "multiple_choice", "true_false", "ordering", "matching", "fill_blank",
    name="quiz_question_type",
)
quiz_scoring_mode_enum = postgresql.ENUM("all_or_nothing", "partial", name="quiz_scoring_mode")
block_progress_status_enum = postgresql.ENUM("started", "completed", name="block_progress_status")

_ALL_ENUMS = [
    event_type_enum,
    event_stream_provider_enum,
    unit_block_type_enum,
    text_block_variant_enum,
    quiz_question_type_enum,
    quiz_scoring_mode_enum,
    block_progress_status_enum,
]


def upgrade() -> None:
    bind = op.get_bind()
    for e in _ALL_ENUMS:
        e.create(bind, checkfirst=True)

    # ─────────────────────── 1. courses → events ───────────────────────
    op.rename_table("courses", "events")

    op.add_column("events", sa.Column("event_type", sa.Text(), nullable=True))
    op.execute("UPDATE events SET event_type = 'recorded_webinar' WHERE event_type IS NULL")
    op.alter_column(
        "events", "event_type",
        type_=postgresql.ENUM(name="event_type", create_type=False),
        postgresql_using="event_type::event_type",
        nullable=False,
    )
    op.add_column(
        "events", sa.Column("is_preview", sa.Boolean(), server_default=sa.text("true"), nullable=False)
    )
    op.add_column(
        "events",
        sa.Column("presenter_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )
    op.add_column("events", sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_events_presenter_id"), "events", ["presenter_id"])

    # event_streams — provider-agnóstico (youtube en Fase 1, mux/livekit a futuro).
    op.create_table(
        "event_streams",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.UUID(), nullable=False),
        sa.Column(
            "provider",
            postgresql.ENUM(name="event_stream_provider", create_type=False),
            nullable=False,
            server_default="youtube",
        ),
        sa.Column("external_video_id", sa.String(length=255), nullable=False),
        sa.Column("is_live_now", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("scheduled_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stream_key_secret", sa.String(length=255), nullable=True),
        sa.ForeignKeyConstraint(["event_id"], ["events.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("event_id"),
    )
    op.execute("GRANT SELECT, INSERT, UPDATE, DELETE ON event_streams TO hg_app, hg_superadmin")

    # ─────────────────────── 2. Learning Units · contenido (global, sin RLS) ───────────────────────

    op.create_table(
        "learning_units",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("pillar_code", sa.String(length=10), nullable=False),
        sa.Column(
            "competency_code",
            postgresql.ENUM(name="competency_code", create_type=False),
            nullable=True,
        ),
        sa.Column("level_code", sa.String(length=10), nullable=False),
        sa.Column("mentor_id", sa.UUID(), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("superseded_by_unit_id", sa.UUID(), nullable=True),
        sa.Column("estimated_duration_seconds", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True),
            server_default=sa.text("now()"), nullable=False,
        ),
        sa.ForeignKeyConstraint(["pillar_code"], ["career_paths.code"]),
        sa.ForeignKeyConstraint(["mentor_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["superseded_by_unit_id"], ["learning_units.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index(op.f("ix_learning_units_pillar_code"), "learning_units", ["pillar_code"])
    op.create_index(op.f("ix_learning_units_mentor_id"), "learning_units", ["mentor_id"])
    op.create_index(
        "ix_learning_units_pillar_level", "learning_units", ["pillar_code", "level_code"],
        postgresql_where=sa.text("published_at IS NOT NULL"),
    )

    op.create_table(
        "unit_blocks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("unit_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("block_type", postgresql.ENUM(name="unit_block_type", create_type=False), nullable=False),
        sa.Column("block_id", sa.UUID(), nullable=False),
        sa.Column("required", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.ForeignKeyConstraint(["unit_id"], ["learning_units.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("unit_id", "position"),
    )
    op.create_index(op.f("ix_unit_blocks_unit_id"), "unit_blocks", ["unit_id"])

    op.create_table(
        "video_blocks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("youtube_video_id", sa.String(length=11), nullable=False),
        sa.Column("poster_url", sa.String(length=2048), nullable=True),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("subtitle_url", sa.String(length=2048), nullable=True),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("eyebrow_label", sa.String(length=60), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "text_blocks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("variant", postgresql.ENUM(name="text_block_variant", create_type=False), nullable=False),
        sa.Column("eyebrow", sa.String(length=60), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("citation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("applies_to", postgresql.ARRAY(sa.String(length=10)), nullable=True),
        sa.Column("requires_evidence_block_id", sa.UUID(), nullable=True),
        sa.ForeignKeyConstraint(["requires_evidence_block_id"], ["text_blocks.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "quiz_blocks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "eyebrow", sa.String(length=60), nullable=False,
            server_default="COMPROBÁ TU COMPRENSIÓN",
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("quiz_block_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column(
            "question_type", postgresql.ENUM(name="quiz_question_type", create_type=False), nullable=False
        ),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["quiz_block_id"], ["quiz_blocks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("quiz_block_id", "position"),
    )
    op.create_index(op.f("ix_quiz_questions_quiz_block_id"), "quiz_questions", ["quiz_block_id"])

    # single_choice + multiple_choice
    op.create_table(
        "quiz_options",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_id", "position"),
    )
    op.create_index(op.f("ix_quiz_options_question_id"), "quiz_options", ["question_id"])

    # true_false
    op.create_table(
        "quiz_true_false",
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("correct_answer", sa.Boolean(), nullable=False),
        sa.Column("explanation_true", sa.Text(), nullable=False),
        sa.Column("explanation_false", sa.Text(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("question_id"),
    )

    # ordering
    op.create_table(
        "quiz_ordering_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("correct_position", sa.Integer(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_id", "correct_position"),
    )
    op.create_index(op.f("ix_quiz_ordering_items_question_id"), "quiz_ordering_items", ["question_id"])

    # matching
    op.create_table(
        "quiz_matching_pairs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("left_text", sa.Text(), nullable=False),
        sa.Column("right_text", sa.Text(), nullable=False),
        sa.Column("is_distractor", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_quiz_matching_pairs_question_id"), "quiz_matching_pairs", ["question_id"])

    # fill_blank
    op.create_table(
        "quiz_fill_blank_answers",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("correct_text", sa.Text(), nullable=False),
        sa.Column("accept_variants", postgresql.ARRAY(sa.Text()), nullable=False, server_default="{}"),
        sa.Column("case_sensitive", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("question_id", "position"),
    )
    op.create_index(
        op.f("ix_quiz_fill_blank_answers_question_id"), "quiz_fill_blank_answers", ["question_id"]
    )

    # multiple_choice scoring config
    op.create_table(
        "quiz_multiple_choice_config",
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column(
            "scoring", postgresql.ENUM(name="quiz_scoring_mode", create_type=False),
            nullable=False, server_default="partial",
        ),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("question_id"),
    )

    op.create_table(
        "reflection_blocks",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("eyebrow", sa.String(length=60), nullable=False, server_default="APLICALO ESTA SEMANA"),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("min_chars", sa.Integer(), nullable=False, server_default=sa.text("30")),
        sa.Column("max_chars", sa.Integer(), nullable=False, server_default=sa.text("500")),
        sa.Column("example", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # ─────────────────────── 3. Progreso (privado, RLS en attempts) ───────────────────────

    op.create_table(
        "learning_unit_attempts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("unit_id", sa.UUID(), nullable=False),
        sa.Column("org_id", sa.UUID(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unit_id"], ["learning_units.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["org_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "unit_id", name="uq_attempt_user_unit"),
    )
    op.create_index(op.f("ix_learning_unit_attempts_org_id"), "learning_unit_attempts", ["org_id"])
    op.create_index(op.f("ix_learning_unit_attempts_user_id"), "learning_unit_attempts", ["user_id"])
    op.create_index(op.f("ix_learning_unit_attempts_unit_id"), "learning_unit_attempts", ["unit_id"])

    op.execute("ALTER TABLE learning_unit_attempts ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE learning_unit_attempts FORCE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY tenant_isolation ON learning_unit_attempts "
        "USING (org_id = current_setting('app.current_org_id', true)::uuid) "
        "WITH CHECK (org_id = current_setting('app.current_org_id', true)::uuid)"
    )
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON learning_unit_attempts TO hg_app, hg_superadmin"
    )

    op.create_table(
        "block_progress",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("attempt_id", sa.UUID(), nullable=False),
        sa.Column("unit_block_id", sa.UUID(), nullable=False),
        sa.Column(
            "status", postgresql.ENUM(name="block_progress_status", create_type=False), nullable=False
        ),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["attempt_id"], ["learning_unit_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["unit_block_id"], ["unit_blocks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", "unit_block_id"),
    )
    op.create_index(op.f("ix_block_progress_attempt_id"), "block_progress", ["attempt_id"])

    op.create_table(
        "quiz_responses",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("attempt_id", sa.UUID(), nullable=False),
        sa.Column("question_id", sa.UUID(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        # Shape depende de question_type: {"selected_option_ids": [...]}
        # | {"boolean_answer": bool} | {"ordering": [...]} | {"matching": [[l,r],...]}
        # | {"fill_blank_answers": [...]}. Ver hg.modules.learning_units.schemas.
        sa.Column("response_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("responded_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["learning_unit_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["quiz_questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_id", "question_id"),
    )
    op.create_index(op.f("ix_quiz_responses_attempt_id"), "quiz_responses", ["attempt_id"])

    op.create_table(
        "reflection_texts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("attempt_id", sa.UUID(), nullable=False),
        sa.Column("reflection_block_id", sa.UUID(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["attempt_id"], ["learning_unit_attempts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reflection_block_id"], ["reflection_blocks.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "char_length(text) BETWEEN 30 AND 500", name="ck_reflection_texts_length"
        ),
        sa.UniqueConstraint("attempt_id", "reflection_block_id"),
    )
    op.create_index(op.f("ix_reflection_texts_attempt_id"), "reflection_texts", ["attempt_id"])

    # ─────────────────────── 4. Grants (catálogo global, sin RLS) ───────────────────────
    content_tables = [
        "learning_units", "unit_blocks", "video_blocks", "text_blocks",
        "quiz_blocks", "quiz_questions", "quiz_options", "quiz_true_false",
        "quiz_ordering_items", "quiz_matching_pairs", "quiz_fill_blank_answers",
        "quiz_multiple_choice_config", "reflection_blocks",
    ]
    op.execute(f"GRANT SELECT, INSERT, UPDATE, DELETE ON {', '.join(content_tables)} TO hg_app, hg_superadmin")
    # attempt-scoped pero sin RLS propio (ver docstring) — grant directo.
    op.execute(
        "GRANT SELECT, INSERT, UPDATE, DELETE ON block_progress, quiz_responses, reflection_texts "
        "TO hg_app, hg_superadmin"
    )


def downgrade() -> None:
    # Reverso completo. ADVERTENCIA: dropea todas las learning_units creadas —
    # no hay forma de preservarlas al volver a `courses` (no existían antes).
    op.execute(
        "DROP TABLE IF EXISTS reflection_texts, quiz_responses, block_progress, "
        "learning_unit_attempts CASCADE"
    )
    op.execute(
        "DROP TABLE IF EXISTS reflection_blocks, quiz_multiple_choice_config, "
        "quiz_fill_blank_answers, quiz_matching_pairs, quiz_ordering_items, "
        "quiz_true_false, quiz_options, quiz_questions, quiz_blocks, text_blocks, "
        "video_blocks, unit_blocks, learning_units CASCADE"
    )
    op.execute("DROP TABLE IF EXISTS event_streams CASCADE")

    op.drop_index(op.f("ix_events_presenter_id"), table_name="events")
    op.drop_column("events", "scheduled_at")
    op.drop_column("events", "presenter_id")
    op.drop_column("events", "is_preview")
    op.drop_column("events", "event_type")
    op.rename_table("events", "courses")

    bind = op.get_bind()
    for e in reversed(_ALL_ENUMS):
        e.drop(bind, checkfirst=True)
