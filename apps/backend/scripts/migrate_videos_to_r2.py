"""Drive → R2 video migration + manifest generator (B1-09).

Recorre una carpeta de nivel del Drive (L1/L2/L3), encuentra los MP4 finales por
competencia (P1..P5 → C1..C5) o foundation (FND - AI/ETH/Specifics), transcodea
a HLS multi-bitrate + thumbnail con ffmpeg, sube a Cloudflare R2 y escribe un
manifest JSON que consume ``seed_catalog.py``.

Requisitos para correr de verdad (no incluidos en el container de dev):
  - ``pip install google-api-python-client google-auth`` (API de Drive)
  - ``ffmpeg`` + ``ffprobe`` en PATH
  - Credenciales Drive: GOOGLE_APPLICATION_CREDENTIALS=service_account.json
  - Credenciales R2 en el env (r2_* del config). Sin ellas, usar --dry-run.

Idempotente: si un slug ya está en el manifest de salida, se saltea.

Uso:
  python scripts/migrate_videos_to_r2.py \
      --drive-folder <FOLDER_ID> --level L1 \
      --manifest-out scripts/manifest/L1.json [--dry-run] [--skip-hls] [--limit N]
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Any

from slugify import slugify

from hg.core.storage import r2_configured, upload_file

log = logging.getLogger("hg.migrate_videos")

# Prefijo del nombre de carpeta del Drive → (competency_code, track).
FOLDER_MAP: dict[str, tuple[str | None, str]] = {
    "P1": ("C1", "competency"),
    "P2": ("C2", "competency"),
    "P3": ("C3", "competency"),
    "P4": ("C4", "competency"),
    "P5": ("C5", "competency"),
    "FND - AI": (None, "foundation_ai"),
    "FND - ETH": (None, "foundation_eth"),
    "FND - SPECIFICS": (None, "foundation_specifics"),
}

# Clips auxiliares que no son cursos (intros, takes crudos, recordings).
HELPER_RE = re.compile(r"\b(intro|raw|recording|take|test|borrador)\b", re.IGNORECASE)

VIDEO_MIME = "video/mp4"


def classify_folder(name: str) -> tuple[str | None, str] | None:
    """Mapea el nombre de carpeta de competencia/foundation a (competency, track)."""
    upper = name.upper()
    for prefix, mapped in FOLDER_MAP.items():
        if upper.startswith(prefix.upper()):
            return mapped
    return None


def clean_title(filename: str) -> str:
    """Nombre de archivo → título limpio (sin extensión, sin _v3 / - Final)."""
    base = re.sub(r"\.[^.]+$", "", filename)
    base = re.sub(r"[-_\s]*(final|v\d+)\s*$", "", base, flags=re.IGNORECASE)
    return base.replace("_", " ").strip()


def make_slug(level: str, competency: str | None, track: str, title: str) -> str:
    prefix = competency or track.replace("foundation_", "fnd-")
    return slugify(f"{level}-{prefix}-{title}")


def is_helper(filename: str) -> bool:
    return bool(HELPER_RE.search(filename))


# ─────────────────────────── Drive (lazy import) ───────────────────────────


def _drive_service() -> Any:
    """Construye el cliente de Drive. Import perezoso: sólo se necesita al crawlear."""
    import os

    from google.oauth2 import service_account  # type: ignore[import-untyped]
    from googleapiclient.discovery import build  # type: ignore[import-untyped]

    creds = service_account.Credentials.from_service_account_file(
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _list_children(service: Any, folder_id: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page_token = None
    while True:
        resp = (
            service.files()
            .list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id,name,mimeType,size)",
                pageToken=page_token,
                pageSize=200,
            )
            .execute()
        )
        items.extend(resp.get("files", []))
        page_token = resp.get("nextPageToken")
        if not page_token:
            break
    return items


def _find_videos(service: Any, folder_id: str) -> list[dict[str, Any]]:
    """Busca MP4 recursivamente bajo ``folder_id`` (maneja subcarpetas como
    '1. Video Creation')."""
    videos: list[dict[str, Any]] = []
    for child in _list_children(service, folder_id):
        if child["mimeType"] == "application/vnd.google-apps.folder":
            videos.extend(_find_videos(service, child["id"]))
        elif child["mimeType"] == VIDEO_MIME:
            videos.append(child)
    return videos


def _download(service: Any, file_id: str, dest: Path) -> None:
    from googleapiclient.http import MediaIoBaseDownload  # type: ignore[import-untyped]

    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as fh:
        downloader = MediaIoBaseDownload(fh, service.files().get_media(fileId=file_id))
        done = False
        while not done:
            _, done = downloader.next_chunk()


# ─────────────────────────── ffmpeg ───────────────────────────


def _probe_duration(path: Path) -> int:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return int(float(out.stdout.strip() or 0))


def _transcode_hls(src: Path, out_dir: Path) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "ffmpeg", "-y", "-i", str(src),
            "-filter_complex",
            "[0:v]split=3[v1][v2][v3];[v1]scale=854:480[v1out];"
            "[v2]scale=1280:720[v2out];[v3]scale=1920:1080[v3out]",
            "-map", "[v1out]", "-c:v:0", "libx264", "-b:v:0", "800k",
            "-map", "[v2out]", "-c:v:1", "libx264", "-b:v:1", "1500k",
            "-map", "[v3out]", "-c:v:2", "libx264", "-b:v:2", "4000k",
            "-map", "a:0", "-map", "a:0", "-map", "a:0", "-c:a", "aac", "-b:a", "128k",
            "-var_stream_map", "v:0,a:0 v:1,a:1 v:2,a:2",
            "-hls_time", "6", "-hls_playlist_type", "vod",
            "-master_pl_name", "master.m3u8",
            "-f", "hls", "-hls_segment_filename", str(out_dir / "stream_%v/data%03d.ts"),
            str(out_dir / "stream_%v/playlist.m3u8"),
        ],
        check=True,
    )
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-ss", "5", "-vframes", "1",
         "-vf", "scale=640:360", str(out_dir / "thumbnail.jpg")],
        check=True,
    )


# ─────────────────────────── manifest ───────────────────────────


def load_manifest(path: Path) -> list[dict[str, Any]]:
    if path.exists():
        return json.loads(path.read_text())
    return []


def main() -> None:
    ap = argparse.ArgumentParser(description="Drive → R2 video migration + manifest")
    ap.add_argument("--drive-folder", required=True, help="ID de la carpeta de nivel")
    ap.add_argument("--level", required=True, choices=["L1", "L2", "L3", "L4", "L5", "L6"])
    ap.add_argument("--manifest-out", required=True, type=Path)
    ap.add_argument("--dry-run", action="store_true", help="no sube a R2; sólo manifest")
    ap.add_argument("--skip-hls", action="store_true", help="copia el MP4 sin transcodear")
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if not r2_configured() and not args.dry_run:
        log.warning("R2 no configurado — forzando --dry-run (sólo manifest).")
        args.dry_run = True

    manifest = load_manifest(args.manifest_out)
    seen = {e["slug"] for e in manifest}
    processed = skipped = failed = 0

    service = _drive_service()
    tmp_root = Path(tempfile.gettempdir()) / "hg_videos" / args.level

    for comp_folder in _list_children(service, args.drive_folder):
        if comp_folder["mimeType"] != "application/vnd.google-apps.folder":
            continue
        mapped = classify_folder(comp_folder["name"])
        if mapped is None:
            continue
        competency, track = mapped
        order = 0
        for video in _find_videos(service, comp_folder["id"]):
            if is_helper(video["name"]):
                continue
            if args.limit and processed >= args.limit:
                break
            title = clean_title(video["name"])
            slug = make_slug(args.level, competency, track, title)
            if slug in seen:
                skipped += 1
                continue
            order += 1
            key_base = f"videos/{args.level}/{competency or track}/{slug}"
            try:
                local = tmp_root / f"{slug}.mp4"
                _download(service, video["id"], local)
                duration = _probe_duration(local)
                hls_url = thumb_url = None
                if not args.dry_run:
                    if args.skip_hls:
                        hls_url = upload_file(local, f"{key_base}/source.mp4", "video/mp4")
                    else:
                        out_dir = tmp_root / slug
                        _transcode_hls(local, out_dir)
                        for f in out_dir.rglob("*"):
                            if f.is_file():
                                rel = f.relative_to(out_dir).as_posix()
                                ct = "application/vnd.apple.mpegurl" if f.suffix == ".m3u8" else (
                                    "video/mp2t" if f.suffix == ".ts" else "image/jpeg"
                                )
                                url = upload_file(f, f"{key_base}/{rel}", ct)
                                if rel == "master.m3u8":
                                    hls_url = url
                                elif rel == "thumbnail.jpg":
                                    thumb_url = url
                else:
                    # dry-run: URLs públicas esperadas (sin subir).
                    base = get_public_base()
                    hls_url = f"{base}/{key_base}/master.m3u8"
                    thumb_url = f"{base}/{key_base}/thumbnail.jpg"
                manifest.append({
                    "slug": slug,
                    "title": title,
                    "career_level": args.level,
                    "competency_code": competency,
                    "track": track,
                    "duration_seconds": duration,
                    "hls_master_url": hls_url,
                    "thumbnail_url": thumb_url,
                    "video_url": None,
                    "order_index": order,
                    "is_active": True,
                })
                seen.add(slug)
                processed += 1
                log.info("processed %s", slug)
            except Exception as exc:
                failed += 1
                log.error("failed %s: %s", video.get("name"), exc)

    args.manifest_out.parent.mkdir(parents=True, exist_ok=True)
    args.manifest_out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
    log.info("done level=%s processed=%d skipped=%d failed=%d -> %s",
             args.level, processed, skipped, failed, args.manifest_out)


def get_public_base() -> str:
    from hg.config import get_settings
    return (get_settings().r2_public_base_url or "https://cdn.humangrowth.io").rstrip("/")


if __name__ == "__main__":
    main()
