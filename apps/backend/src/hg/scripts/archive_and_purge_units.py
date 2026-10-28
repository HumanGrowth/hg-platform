"""Reemplazo del catálogo por el contenido oficial (Wave 2): archivar + purgar.

Decisión de negocio: se **preservan** (archivadas, con su progreso) solo las
unidades de Carrera Profesional L1/L2 de Adaptabilidad (P1), Experticia (P3) y
Comunicación (P4) que ya estaban publicadas — las que usa Grupo CESA con
usuarios reales. Todo el resto del catálogo se borra (CASCADE: intentos,
progreso, asignaciones, ítems de ruta).

"Archivar" = la unidad vieja queda **reemplazada** (``superseded_by_unit_id``)
por la unidad nueva del Drive con el mismo slug. Catálogo, sequencing,
onboarding, badges y asignaciones ya excluyen las reemplazadas, y conservan
attempts/block_progress/quiz_responses para el historial.

Dos fases, con el sync del Drive en el medio (los slugs nuevos coinciden con
los viejos y el slug es único):

    python -m hg.scripts.archive_and_purge_units --phase pre  [--dry-run]
    python -m hg.scripts.sync_units_from_drive --root-folder-id <1. Spanish>
    python -m hg.scripts.archive_and_purge_units --phase post [--dry-run]

- ``pre``: renombra el slug de las preservadas a ``legacy-<slug>`` y borra el
  resto de las unidades existentes.
- ``post``: apunta cada ``legacy-<slug>`` a la unidad nueva ``<slug>``.

``--dry-run`` hace todo en una transacción que se revierte. Usa
``DATABASE_URL_NEON_OWNER`` si existe (ve los intentos pese a RLS), si no
``DATABASE_URL``.
"""
from __future__ import annotations

import argparse
import logging
import os
import re

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

log = logging.getLogger("archive_and_purge_units")

LEGACY_PREFIX = "legacy-"
KEEP_PILLARS = ("P1", "P3", "P4")
KEEP_LEVELS = ("L1", "L2")
DEFAULT_EXPECTED = 26
# FKs hacia learning_units (tabla, columna), leídas del catálogo de Postgres: el
# conteo previo al borrado no depende de nombres de columna hardcodeados.
_DEPENDENTS_SQL = """
SELECT c.conrelid::regclass::text, a.attname
FROM pg_constraint c
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.contype = 'f' AND c.confrelid = 'learning_units'::regclass
  AND c.conrelid <> 'learning_units'::regclass AND c.confdeltype = 'c'
ORDER BY 1
"""

_KEEP_WHERE = (
    "dimension_code = 'CP' AND level_code = ANY(:levels) AND pillar_code = ANY(:pillars) "
    "AND published_at IS NOT NULL AND slug NOT LIKE :legacy"
)


def _params() -> dict[str, object]:
    return {
        "levels": list(KEEP_LEVELS),
        "pillars": list(KEEP_PILLARS),
        "legacy": f"{LEGACY_PREFIX}%",
    }


def _engine_url() -> str:
    url = os.environ.get("DATABASE_URL_NEON_OWNER") or os.environ["DATABASE_URL"]
    return re.sub(r"^postgresql(\+\w+)?://", "postgresql+psycopg://", url)


def phase_pre(conn: Connection, expected: int) -> None:
    keep_ids = [
        r[0] for r in conn.execute(text(f"SELECT id FROM learning_units WHERE {_KEEP_WHERE}"), _params())
    ]
    if len(keep_ids) != expected:
        raise SystemExit(
            f"ABORTA: {len(keep_ids)} unidades a preservar, se esperaban {expected}. "
            "Revisar el criterio antes de borrar nada."
        )
    already = conn.execute(
        text("SELECT count(*) FROM learning_units WHERE slug LIKE :legacy"), _params()
    ).scalar_one()
    if already:
        raise SystemExit(f"ABORTA: ya hay {already} unidades 'legacy-*' (¿fase pre ya corrida?).")

    purge_ids = [
        r[0]
        for r in conn.execute(text("SELECT id FROM learning_units WHERE id <> ALL(:keep)"), {"keep": keep_ids})
    ]
    log.info("preservar=%d · borrar=%d", len(keep_ids), len(purge_ids))
    for table, col in conn.execute(text(_DEPENDENTS_SQL)).all():
        n = conn.execute(
            text(f"SELECT count(*) FROM {table} WHERE {col} = ANY(:ids)"), {"ids": purge_ids}
        ).scalar_one()
        log.info("  se perderán %s: %d filas", table, n)

    # Renombrar primero (libera los slugs para el sync) y después purgar.
    conn.execute(
        text("UPDATE learning_units SET slug = left(:p || slug, 120) WHERE id = ANY(:keep)"),
        {"p": LEGACY_PREFIX, "keep": keep_ids},
    )
    conn.execute(text("DELETE FROM learning_units WHERE id = ANY(:ids)"), {"ids": purge_ids})
    log.info("renombradas %d · borradas %d", len(keep_ids), len(purge_ids))


def phase_post(conn: Connection, expected: int) -> None:
    rows = conn.execute(
        text(
            "SELECT old.id, old.slug, new.id FROM learning_units old "
            "LEFT JOIN learning_units new ON new.slug = substr(old.slug, :n) "
            "WHERE old.slug LIKE :legacy"
        ),
        {"n": len(LEGACY_PREFIX) + 1, "legacy": f"{LEGACY_PREFIX}%"},
    ).all()
    missing = [r[1] for r in rows if r[2] is None]
    if len(rows) != expected or missing:
        raise SystemExit(
            f"ABORTA: legacy={len(rows)} (esperadas {expected}); sin reemplazo nuevo: {missing}"
        )
    for old_id, _slug, new_id in rows:
        conn.execute(
            text("UPDATE learning_units SET superseded_by_unit_id = :new WHERE id = :old"),
            {"new": new_id, "old": old_id},
        )
    log.info("vinculadas %d unidades legacy → reemplazo nuevo (superseded_by_unit_id)", len(rows))


def main(argv: list[str] | None = None) -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--phase", choices=("pre", "post"), required=True)
    ap.add_argument("--dry-run", action="store_true", help="Todo en una transacción que se revierte.")
    ap.add_argument("--expect", type=int, default=DEFAULT_EXPECTED, help="Nº de unidades a preservar.")
    args = ap.parse_args(argv)

    engine = create_engine(_engine_url())
    with engine.connect() as conn:
        tx = conn.begin()
        try:
            (phase_pre if args.phase == "pre" else phase_post)(conn, args.expect)
        except BaseException:
            tx.rollback()
            raise
        if args.dry_run:
            tx.rollback()
            log.info("DRY-RUN: transacción revertida, nada cambió.")
        else:
            tx.commit()
            log.info("OK: cambios confirmados.")


if __name__ == "__main__":
    main()
