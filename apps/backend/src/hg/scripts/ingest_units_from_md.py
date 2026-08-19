"""Ingesta de units desde los .md corregidos + videos de la carpeta de Drive.

Caso de uso: los Docs de Drive de algunas units están en un esquema viejo o
incompletos (el sync normal los saltea con "falta 'slug'"). El contenido
corregido vive en archivos Markdown (bloques ```json bajo encabezados
``## <CODE> — `slug` ``), y este script los ingesta usando:

- **Contenido** (JSON de la unit): del .md, matcheado a la carpeta por el
  **código canónico** (``format_unit_code``; IA→AI, y para PR se inserta el
  nivel constante ``L1``).
- **Videos**: de la carpeta de Drive correspondiente (mismo pipeline que el
  sync: descarga MP4 → sube a R2).
- **dimensión/nivel/pilar/unidad**: derivados del **folder** (fuente de verdad),
  sobreescribiendo lo que diga el .md — igual que ``sync_units_from_drive``.

Requiere ``GOOGLE_APPLICATION_CREDENTIALS`` (Drive), credenciales R2 y
``DATABASE_URL`` (owner, para pre-seed de badges). Idempotente por slug.

Uso::

    python -m hg.scripts.ingest_units_from_md --dry-run --files a.md b.md c.md
    python -m hg.scripts.ingest_units_from_md --files a.md b.md c.md
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import tempfile
from pathlib import Path
from typing import Any

from hg.core.storage import r2_configured
from hg.db import SessionLocal
from hg.modules.badges.progression import ensure_pillar_badge
from hg.modules.learning_units.services import upsert_unit_from_dict
from hg.modules.learning_units.unit_code import format_unit_code, parse_unit_code
from hg.scripts.sync_units_from_drive import (
    DEFAULT_ROOT_FOLDER_ID,
    _drive_folders,
    assemble_unit_dict,
    derive_unit_code,
    sanitize_unit_json,
    try_publish,
    upload_mp4_to_r2,
)

log = logging.getLogger("hg.ingest_units_from_md")

_HDR_RE = re.compile(r"^##\s+([A-Z0-9-]+)\s+—\s+`([^`]+)`", re.MULTILINE)
_JSON_RE = re.compile(r"```json\s*(.*?)```", re.DOTALL)


def _canonical_key(header_code: str) -> str:
    """``CP-L1-AI-001``/``CP-L2-P1-001`` se parsean directo; ``PR-V0-001`` (sin
    nivel, PR usa nivel constante) recibe ``L1`` antes de parsear. Devuelve el
    código canónico (``format_unit_code``) para matchear contra el folder."""
    code_str = header_code
    if not re.search(r"-L\d", header_code):
        code_str = re.sub(r"^([A-Z]{2,3})-", r"\1-L1-", header_code)
    uc = parse_unit_code(code_str)
    return format_unit_code(uc) if uc else header_code


def load_units(paths: list[str]) -> dict[str, tuple[str, dict[str, Any]]]:
    """{código_canónico: (header_code, unit_json)} desde los .md."""
    out: dict[str, tuple[str, dict[str, Any]]] = {}
    for p in paths:
        text = Path(p).read_text(encoding="utf-8")
        segs = re.split(r"(```json\s*.*?```)", text, flags=re.DOTALL)
        for i, seg in enumerate(segs):
            if not seg.startswith("```json"):
                continue
            m = list(_HDR_RE.finditer(segs[i - 1]))
            if not m:
                log.warning("bloque json sin encabezado '## CODE — `slug`' — se saltea")
                continue
            header = m[-1].group(1)
            raw = _JSON_RE.match(seg).group(1)  # type: ignore[union-attr]
            out[_canonical_key(header)] = (header, json.loads(raw))
    return out


def run(args: argparse.Namespace) -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if not args.dry_run and not r2_configured():
        raise SystemExit(
            "R2 no está configurado: los video_url saldrían relativos y "
            "VideoBlockCreate exige http(s)://. Configurá R2_ACCOUNT_ID, "
            "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_BASE_URL "
            "(o usá --dry-run)."
        )
    md = load_units(args.files)
    log.info("units en los .md: %d · R2=%s", len(md), r2_configured())

    matched: set[str] = set()
    ok = drafts = failed = 0
    for folder in _drive_folders(args.root_folder_id, None):
        code = derive_unit_code(folder.name, folder.mp4_names)
        if code is None:
            continue
        key = format_unit_code(code)
        if key not in md:
            continue
        _, unit_json = md[key]
        matched.add(key)
        unit_json = sanitize_unit_json(dict(unit_json))
        # Folder = fuente de verdad (sobreescribe el .md).
        unit_json["dimension_code"] = code.dimension
        unit_json["area_code"] = code.area
        unit_json.pop("pillar_code", None)
        unit_json["pillar_code"] = code.pillar
        unit_json["unit_number"] = code.number
        unit_json["level_code"] = f"L{code.level}"
        slug = unit_json["slug"]

        if args.dry_run:
            log.info("→ %s ← %s · %d video(s)", key, slug, folder.mp4_count)
            continue

        try:
            with tempfile.TemporaryDirectory(prefix=f"lu_{slug}_") as tmp:
                paths = folder.mp4_paths(Path(tmp))
                urls = [upload_mp4_to_r2(p, slug, i) for i, p in enumerate(paths, 1)]
            final = assemble_unit_dict(unit_json, urls)
            db = SessionLocal()
            try:
                unit = upsert_unit_from_dict(db, final, publish=False)
                db.flush()
                ensure_pillar_badge(db, code.dimension, code.pillar)
                errs = try_publish(db, unit)
                db.commit()
                if errs:
                    drafts += 1
                    log.warning("  ⚠️ %s BORRADOR: %s", slug, errs[0])
                else:
                    ok += 1
                    log.info("  ✅ %s publicada · %d video(s)", slug, folder.mp4_count)
            finally:
                db.close()
        except Exception as exc:  # no abortar el lote por una unit
            failed += 1
            log.error("  ✗ %s: %s: %s", slug, type(exc).__name__, str(exc).splitlines()[0])

    missing = set(md) - matched
    for k in sorted(missing):
        log.warning("SIN carpeta/video en Drive: %s (%s)", k, md[k][0])
    log.info(
        "listo · matched=%d/%d · publicadas=%d · borradores=%d · fallidas=%d · sin-carpeta=%d",
        len(matched), len(md), ok, drafts, failed, len(missing),
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--files", nargs="+", required=True, help="archivos .md con los bloques json")
    ap.add_argument("--root-folder-id", default=DEFAULT_ROOT_FOLDER_ID)
    ap.add_argument("--dry-run", action="store_true", help="no toca R2 ni la DB")
    run(ap.parse_args())


if __name__ == "__main__":
    main()
