"""Backfill de `poster_url` en video_blocks (cierre-beta TASK 2.1).

Para cada ``video_block`` con ``video_url`` y sin ``poster_url``: descarga el MP4,
extrae un frame en ``t=1s`` con ffmpeg, lo sube a R2 y actualiza ``poster_url``.

Idempotente: saltea los que ya tienen poster. Correr una sola vez, con snapshot
de Neon previo:

    GOOGLE_APPLICATION_CREDENTIALS=... \\
    DATABASE_URL=<PROD> python -m hg.scripts.backfill_posters [--dry-run]

Requiere ``ffmpeg`` en el PATH. Sin credenciales de R2 (`r2_configured()==False`)
``storage.upload_bytes`` corre en dry-run y devuelve la URL esperada sin subir.
"""
from __future__ import annotations

import argparse
import logging
import subprocess
import tempfile
from pathlib import Path

from sqlalchemy import select, text

from hg.config import get_settings
from hg.core import storage
from hg.db import SessionLocal
from hg.modules.learning_units.models import LearningUnit, UnitBlock, VideoBlock

log = logging.getLogger("hg.backfill_posters")

_POSTER_TS = "1"  # segundo del frame a extraer


def _has_ffmpeg() -> bool:
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (OSError, subprocess.CalledProcessError):
        return False


def _r2_key_from_url(video_url: str) -> str:
    """Deriva la key de R2 desde la URL pública (strip del base público)."""
    base = get_settings().r2_public_base_url.rstrip("/")
    return video_url.removeprefix(base + "/").lstrip("/")


def _extract_poster(video_url: str, out_jpg: Path) -> bool:
    """Baja el MP4 desde R2 (S3 API, no la URL pública — el CDN da 403 a GET
    directos) y extrae un frame JPEG en t=1s. False si falla."""
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=True) as tmp:
        try:
            client = storage.get_r2_client()
            client.download_fileobj(get_settings().r2_bucket, _r2_key_from_url(video_url), tmp)
            tmp.flush()
        except Exception as exc:
            log.error("download_failed url=%s err=%s", video_url, exc)
            return False
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-ss", _POSTER_TS, "-i", tmp.name,
                 "-frames:v", "1", "-q:v", "3", str(out_jpg)],
                capture_output=True, check=True,
            )
            return out_jpg.exists() and out_jpg.stat().st_size > 0
        except subprocess.CalledProcessError as exc:
            log.error("ffmpeg_failed url=%s err=%s", video_url, exc.stderr[:200] if exc.stderr else "")
            return False


def run(dry_run: bool) -> None:
    if not _has_ffmpeg():
        raise SystemExit("ffmpeg no está en el PATH — instalalo antes de correr el backfill.")

    db = SessionLocal()
    done = skipped = failed = 0
    try:
        # `learning_units`/`video_blocks` no son accesibles por el rol de conexión
        # pelado (neondb_owner NOINHERIT sobre esas tablas); elevamos a
        # hg_superadmin a nivel sesión (persiste entre commits, no es SET LOCAL).
        db.execute(text("SET ROLE hg_superadmin"))
        rows = db.execute(
            select(VideoBlock, LearningUnit.slug)
            .join(UnitBlock, UnitBlock.block_id == VideoBlock.id)
            .join(LearningUnit, LearningUnit.id == UnitBlock.unit_id)
            .where(VideoBlock.poster_url.is_(None), VideoBlock.video_url.isnot(None))
        ).all()
        log.info("video_blocks sin poster: %d", len(rows))
        for vb, slug in rows:
            key = f"learning-units/{slug}/poster-{vb.id.hex[:8]}.jpg"
            if dry_run:
                log.info("[dry-run] %s ← frame de %s", key, vb.video_url)
                skipped += 1
                continue
            with tempfile.TemporaryDirectory() as td:
                out = Path(td) / "poster.jpg"
                if not _extract_poster(vb.video_url, out):
                    failed += 1
                    continue
                url = storage.upload_bytes(out.read_bytes(), key, "image/jpeg")
                vb.poster_url = url
                db.commit()
                log.info("poster ✓ %s → %s", slug, url)
                done += 1
    finally:
        db.close()
    log.info("listo · done=%d · skipped=%d · failed=%d", done, skipped, failed)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    ap = argparse.ArgumentParser(description="Backfill de poster_url en video_blocks")
    ap.add_argument("--dry-run", action="store_true", help="No descarga ni sube; solo lista.")
    run(ap.parse_args().dry_run)


if __name__ == "__main__":
    main()
