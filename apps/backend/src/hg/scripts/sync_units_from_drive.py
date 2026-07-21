"""Bulk import de Learning Units desde Google Drive → R2 → DB (TASK lu-refine-A-11).

Jorge Araya publica units en un folder raíz de Drive; cada sub-folder
(``CP-L1-P{n}-{seq}``) trae 1-2 videos MP4 y un Google Doc con el **JSON de la
unit embebido** (mismo formato que ``HG-P1-L1-001.json``). Este script recorre
esos sub-folders, sube los MP4 a R2, arma los video_blocks apuntando a las URLs
de R2 y hace upsert de cada unit en la DB (idempotente por slug, vía
:func:`hg.modules.learning_units.services.upsert_unit_from_dict`).

Dos modos de entrada:

- **Drive API** (default): lista y descarga desde Drive. Requiere
  ``GOOGLE_APPLICATION_CREDENTIALS`` (service account con scope
  ``drive.readonly``).
- **Carpeta local** (``--local-folder DIR --skip-drive-download``): lee
  sub-folders ya sincronizados a disco (ej. con ``rclone``, ver el doc
  ``docs/learning-units/bulk-import-from-drive.md``). No necesita credenciales
  de Drive.

En ambos modos, subir los MP4 a R2 requiere credenciales R2 (``r2_*`` en el
config). Sin ellas, ``hg.core.storage.upload_file`` opera en modo dry-run
(devuelve la URL pública esperada sin subir) — útil para probar el flujo, pero
los videos no van a reproducir hasta que se suban de verdad.

Uso::

    # Drive API, importa las 16 units:
    python -m hg.scripts.sync_units_from_drive --root-folder-id 1JeGr5jYk...

    # Sin ejecutar (lista lo que haría, no toca R2 ni DB):
    python -m hg.scripts.sync_units_from_drive --dry-run

    # Sólo un sub-folder:
    python -m hg.scripts.sync_units_from_drive --only CP-L1-P1-001

    # Desde una copia local (rclone), sin Google Drive API:
    python -m hg.scripts.sync_units_from_drive \\
        --local-folder "HG/1.Product/5. Videos Final Version" --skip-drive-download

Idempotente: correrlo dos veces no duplica units (upsert por slug).
"""
from __future__ import annotations

import argparse
import json
import logging
import re
import tempfile
from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from hg.core.storage import r2_configured, upload_file
from hg.db import SessionLocal
from hg.modules.learning_units.services import (
    UnitDictError,
    try_publish,
    upsert_unit_from_dict,
)

log = logging.getLogger("hg.sync_units_from_drive")

DEFAULT_ROOT_FOLDER_ID = "1JeGr5jYk5IjarRxigtsyGEcZy_VXzNb3"
R2_KEY_PREFIX = "learning-units"
# Sin ffprobe/moviepy (regla dura: sin deps nuevas) no hay duración real del
# MP4 — placeholder. Andrés puede ajustar post-import cuando se lea metadata.
PLACEHOLDER_VIDEO_DURATION = 60

_VIDEO_MIME = "video/mp4"
_DOC_MIME = "application/vnd.google-apps.document"
_FOLDER_MIME = "application/vnd.google-apps.folder"

# tiers de evidencia que acepta el schema CitationOut. Los Docs de Jorge traen
# valores fuera de este enum (``teórico``, ``neuroscience``) — se mapean al piso
# más conservador (``expert_opinion``) para no sobrevender la fuerza de la
# evidencia, con un warning para que Andrés corrija en la fuente.
_ALLOWED_TIERS = frozenset({"meta_analysis", "rct", "observational", "expert_opinion"})
_FALLBACK_TIER = "expert_opinion"

# Códigos de competencia válidos (enum de DB). Los Docs traen a veces un label
# libre (``Expertise``) en vez del código — se deja en null (competency_code es
# nullable y no es requisito de publish) con un warning.
_VALID_COMPETENCY_CODES = frozenset({"C1", "C2", "C3", "C4", "C5"})

_FOLDER_NAME_RE = re.compile(r"^CP-(L\d)-(P\d)-(\d+)\b")
_VID_NUM_RE = re.compile(r"VID(\d+)", re.IGNORECASE)


def _vid_sort_key(name: str) -> tuple[int, str]:
    """Ordena los MP4 por el número de ``VID{n}`` del nombre, no por el nombre
    completo — algunos archivos vienen con el prefijo mal tipeado (visto:
    ``CP-P1-P3-003 - VID1.mp4`` en vez de ``CP-L1-...``), y un sort por nombre
    completo invertiría VID1/VID2. Fallback al nombre si no hay ``VID{n}``."""
    m = _VID_NUM_RE.search(name)
    return (int(m.group(1)) if m else 9999, name)

# Escapes que el export a texto plano de Google Docs agrega sobre el JSON
# (Docs "markdownea" guiones bajos, corchetes, etc.). Se revierten antes de
# parsear. NO se tocan comillas: el JSON embebido usa comillas rectas.
_MARKDOWN_ESCAPES = {
    r"\_": "_",
    r"\[": "[",
    r"\]": "]",
    r"\*": "*",
    r"\`": "`",
    r"\#": "#",
    r"\<": "<",
    r"\>": ">",
    r"\~": "~",
}


# ─────────────────────────── Parsers (puros, testeables sin I/O) ───────────────────────────


def parse_folder_name(folder_name: str) -> tuple[str, str, str]:
    """``CP-L1-P1-001`` → ``("L1", "P1", "001")`` (level, pillar, seq).

    Tolera sufijos después del seq (ej. ``CP-L1-P1-001 - algo``). Levanta
    ``ValueError`` si el nombre no matchea el patrón esperado.
    """
    m = _FOLDER_NAME_RE.match(folder_name.strip())
    if not m:
        raise ValueError(f"nombre de folder inesperado (no es CP-Lx-Py-seq): {folder_name!r}")
    return m.group(1), m.group(2), m.group(3)


def extract_json_from_doc_text(doc_text: str) -> dict[str, Any]:
    """Extrae y parsea el JSON de la unit embebido en el texto del Google Doc.

    El Doc trae prosa alrededor del JSON y escapes de markdown que Docs agrega
    al exportar a texto plano. Se limpian los escapes y se parsea el primer
    objeto JSON válido con ``raw_decode`` (ignora prosa/basura después del ``}``
    de cierre — mismo problema del caracter suelto en ``HG-P1-L1-001.json``).
    """
    cleaned = doc_text
    for esc, repl in _MARKDOWN_ESCAPES.items():
        cleaned = cleaned.replace(esc, repl)

    start = cleaned.find("{")
    if start == -1:
        raise UnitDictError("no se encontró ningún objeto JSON ('{') en el Doc")
    try:
        obj, _ = json.JSONDecoder().raw_decode(cleaned[start:])
    except json.JSONDecodeError as exc:
        raise UnitDictError(f"JSON embebido en el Doc no parseable: {exc}") from exc
    if not isinstance(obj, dict) or "slug" not in obj:
        raise UnitDictError("el JSON del Doc no tiene la forma esperada (falta 'slug')")
    return obj


def _sanitize_citation(citation: dict[str, Any], slug: str) -> dict[str, Any]:
    """Ajusta una citación de un Doc de Jorge al schema ``CitationOut`` (estricto)
    sin perder información:

    - ``doi_or_url`` ausente o vacío → ``""`` (la unit queda como borrador: la
      validación de publish exige un DOI/URL no vacío — hay que completarlo en
      la fuente).
    - ``tier`` fuera del enum (``teórico``, ``neuroscience``, ...) → mapeado a
      ``expert_opinion`` (piso conservador), con warning.

    ``text`` / ``source`` / ``year`` se conservan tal cual (en los Docs reales
    siempre vienen bien formados)."""
    c = dict(citation)
    if not c.get("doi_or_url"):
        if "doi_or_url" not in c:
            c["doi_or_url"] = ""
        log.warning(
            "  %s: citación sin doi_or_url — queda vacío (unit NO publicable hasta "
            "completarlo en el Doc): %r",
            slug, c.get("text"),
        )
    tier = c.get("tier")
    if tier not in _ALLOWED_TIERS:
        log.warning(
            "  %s: tier %r fuera del enum — mapeado a %r (corregir en el Doc): %r",
            slug, tier, _FALLBACK_TIER, c.get("text"),
        )
        c["tier"] = _FALLBACK_TIER
    return c


def sanitize_unit_json(unit_json: dict[str, Any]) -> dict[str, Any]:
    """Normaliza un Doc de Jorge para que sea ingestable por
    ``upsert_unit_from_dict`` (schemas + enums estrictos), sin perder contenido:

    - ``competency_code`` con un label libre (no C1-C5) → ``null`` (nullable, no
      es requisito de publish), con warning.
    - citaciones de los ``text_evidence`` → :func:`_sanitize_citation`.

    El resto del contenido no se toca."""
    slug = unit_json.get("slug", "?")
    out = dict(unit_json)

    cc = out.get("competency_code")
    if cc is not None and cc not in _VALID_COMPETENCY_CODES:
        log.warning(
            "  %s: competency_code %r inválido (no es C1-C5) — se deja en null "
            "(corregir en el Doc): ", slug, cc,
        )
        out["competency_code"] = None

    blocks: list[dict[str, Any]] = []
    for b in out.get("blocks", []):
        if b.get("type") == "text_evidence" and isinstance(b.get("citation"), dict):
            b = {**b, "citation": _sanitize_citation(b["citation"], slug)}
        blocks.append(b)
    out["blocks"] = blocks
    return out


def _is_video_block(block: dict[str, Any]) -> bool:
    return str(block.get("type", "")).startswith("video")


def build_video_blocks(video_urls: list[str]) -> list[dict[str, Any]]:
    """Arma dicts de video_block para prepender (units cuyo JSON NO trae slots
    de video — "familia B").

    El primero es ``video_intro``; los siguientes, ``video_teaching`` (una unit
    puede traer 2 MP4). ``duration_seconds`` es un placeholder (sin ffprobe).
    """
    blocks: list[dict[str, Any]] = []
    for i, url in enumerate(video_urls, start=1):
        blocks.append(
            {
                "type": "video_intro" if i == 1 else "video_teaching",
                "required": True,
                "video_url": url,
                "duration_seconds": PLACEHOLDER_VIDEO_DURATION,
                "eyebrow_label": f"VIDEO {i}",
            }
        )
    return blocks


def _fill_video_slot(slot: dict[str, Any], url: str) -> dict[str, Any]:
    """Convierte un slot de video del JSON de Jorge en un video_block válido:
    setea ``video_url`` con la URL real de R2, conserva ``duration_seconds`` /
    ``eyebrow_label`` / ``required`` reales y descarta los campos placeholder de
    referencia que traen los Docs (``video_id``, ``youtube_video_id``,
    ``video_url_or_id``, ``internal_video_id``, ...) — ninguno es una URL usable."""
    return {
        "type": slot["type"],
        "required": slot.get("required", True),
        "video_url": url,
        "duration_seconds": slot.get("duration_seconds") or PLACEHOLDER_VIDEO_DURATION,
        "eyebrow_label": slot.get("eyebrow_label"),
    }


def assemble_unit_dict(unit_json: dict[str, Any], video_urls: list[str]) -> dict[str, Any]:
    """Combina el JSON de la unit con los MP4 reales (URLs de R2) y devuelve el
    dict listo para :func:`upsert_unit_from_dict`.

    Dos formas de JSON conviven en el Drive de Jorge:

    - **Familia A** — el JSON ya trae slots de video (``video_intro`` /
      ``video_teaching`` / ``video_closing``) en sus posiciones, con duraciones
      y eyebrows reales pero sin URL reproducible. Se rellenan los slots **en
      orden** con los MP4 disponibles (VID1→primer slot, ...) y se **descartan**
      los slots que no tienen MP4 (típicamente el ``video_closing``: nunca hay 3
      MP4). Como descartar/rellenar corre las posiciones, los
      ``requires_evidence_position`` se recalculan **simbólicamente** (siguiendo
      al bloque destino, no al número).
    - **Familia B** — el JSON no trae slots; se prepend-ean los MP4 como
      ``video_intro`` + ``video_teaching`` (``build_video_blocks``).

    ``requires_evidence_position`` en el JSON de Jorge apunta al índice real del
    ``text_evidence`` (verificado: incluye los video slots), así que se resuelve
    a ese bloque antes de mover nada y se reescribe al índice final.
    """
    raw = [dict(b) for b in unit_json.get("blocks", [])]
    # Etiqueta temporal para seguir cada bloque a través del reordenamiento.
    for i, b in enumerate(raw):
        b["_uid"] = i
    # Resolver requires_evidence_position → uid del bloque destino (antes de mover).
    for b in raw:
        if b.get("type") == "text_solution" and b.get("requires_evidence_position"):
            p = b["requires_evidence_position"]
            b["_ev_uid"] = raw[p - 1]["_uid"] if 1 <= p <= len(raw) else None

    if any(_is_video_block(b) for b in raw):
        # Familia A: rellenar slots en orden, descartar los sin MP4.
        urls = iter(video_urls)
        final: list[dict[str, Any]] = []
        for b in raw:
            if _is_video_block(b):
                url = next(urls, None)
                if url is None:
                    continue  # slot sin MP4 (p.ej. closing) → se descarta
                filled = _fill_video_slot(b, url)
                filled["_uid"] = b["_uid"]
                final.append(filled)
            else:
                final.append(b)
    else:
        # Familia B: prepend (los video_blocks nuevos no tienen _uid, no son destino).
        final = build_video_blocks(video_urls) + raw

    # Recalcular requires_evidence_position al índice final del bloque destino.
    uid_to_pos = {b["_uid"]: i + 1 for i, b in enumerate(final) if "_uid" in b}
    for b in final:
        if b.get("type") == "text_solution" and b.get("_ev_uid") is not None:
            b["requires_evidence_position"] = uid_to_pos.get(b["_ev_uid"])
    for b in final:
        b.pop("_uid", None)
        b.pop("_ev_uid", None)

    return {**unit_json, "blocks": final}


# ─────────────────────────── R2 upload ───────────────────────────


def upload_mp4_to_r2(local_path: Path, slug: str, vid_num: int) -> str:
    """Sube un MP4 a ``{prefix}/{slug}/VID{n}.mp4`` en el bucket R2 configurado y
    devuelve la URL pública (servida por el CDN, ``r2_public_base_url``).

    Reusa ``hg.core.storage.upload_file`` (dry-run-safe: sin credenciales R2,
    loguea y devuelve la URL esperada sin subir)."""
    key = f"{R2_KEY_PREFIX}/{slug}/VID{vid_num}.mp4"
    return upload_file(local_path, key, _VIDEO_MIME)


# ─────────────────────────── Fuente de folders (Drive / local) ───────────────────────────


@dataclass
class FolderPayload:
    """Un sub-folder a procesar, con acceso perezoso a su Doc y sus MP4."""

    name: str
    _doc_text_fn: Any  # () -> str
    _mp4_paths_fn: Any  # (tmp_dir: Path | None) -> list[Path]
    mp4_count: int = 0
    extra: dict[str, Any] = field(default_factory=dict)

    def doc_text(self) -> str:
        return self._doc_text_fn()

    def mp4_paths(self, tmp_dir: Path | None) -> list[Path]:
        return self._mp4_paths_fn(tmp_dir)


# ---- Drive API (lazy import, mismo patrón que scripts/migrate_videos_to_r2.py) ----


def _drive_service() -> Any:
    import os

    from google.oauth2 import service_account  # type: ignore[import-untyped]
    from googleapiclient.discovery import build  # type: ignore[import-untyped]

    creds = service_account.Credentials.from_service_account_file(
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"],
        scopes=["https://www.googleapis.com/auth/drive.readonly"],
    )
    return build("drive", "v3", credentials=creds, cache_discovery=False)


def _drive_list_children(service: Any, folder_id: str) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    page_token = None
    while True:
        resp = (
            service.files()
            .list(
                q=f"'{folder_id}' in parents and trashed=false",
                fields="nextPageToken, files(id,name,mimeType)",
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


def _drive_export_doc(service: Any, doc_id: str) -> str:
    content = service.files().export(fileId=doc_id, mimeType="text/plain").execute()
    return content.decode("utf-8") if isinstance(content, bytes) else content


def _drive_download_media(service: Any, file_id: str, dest: Path) -> None:
    from googleapiclient.http import MediaIoBaseDownload  # type: ignore[import-untyped]

    dest.parent.mkdir(parents=True, exist_ok=True)
    with dest.open("wb") as fh:
        downloader = MediaIoBaseDownload(fh, service.files().get_media(fileId=file_id))
        done = False
        while not done:
            _, done = downloader.next_chunk()


def _drive_folders(root_folder_id: str, only: str | None) -> Iterator[FolderPayload]:
    service = _drive_service()
    for entry in _drive_list_children(service, root_folder_id):
        if entry["mimeType"] != _FOLDER_MIME:
            continue
        name = entry["name"]
        if only and name != only:
            continue
        children = _drive_list_children(service, entry["id"])
        docs = [c for c in children if c["mimeType"] == _DOC_MIME]
        mp4s = sorted(
            (c for c in children if c["mimeType"] == _VIDEO_MIME),
            key=lambda c: _vid_sort_key(c["name"]),
        )
        if not docs:
            log.warning("  %s: sin Google Doc — se saltea", name)
            continue

        def _doc_text(doc_id: str = docs[0]["id"]) -> str:
            return _drive_export_doc(service, doc_id)

        def _mp4_paths(tmp_dir: Path | None, files: list[dict[str, Any]] = mp4s) -> list[Path]:
            assert tmp_dir is not None
            out: list[Path] = []
            for i, f in enumerate(files, start=1):
                dest = tmp_dir / f"VID{i}.mp4"
                _drive_download_media(service, f["id"], dest)
                out.append(dest)
            return out

        yield FolderPayload(name=name, _doc_text_fn=_doc_text, _mp4_paths_fn=_mp4_paths,
                            mp4_count=len(mp4s))


# ---- Carpeta local (rclone / Drive ya sincronizado a disco) ----


def _local_folders(root: Path, only: str | None) -> Iterator[FolderPayload]:
    for sub in sorted(p for p in root.iterdir() if p.is_dir()):
        name = sub.name
        if not _FOLDER_NAME_RE.match(name):
            continue
        if only and name != only:
            continue
        # Doc exportado (.txt) o JSON directo (.json).
        docs = sorted(sub.glob("*.txt")) + sorted(sub.glob("*.json"))
        mp4s = sorted(sub.glob("*.mp4"), key=lambda p: _vid_sort_key(p.name))
        if not docs:
            log.warning("  %s: sin .txt/.json — se saltea", name)
            continue

        def _doc_text(doc_path: Path = docs[0]) -> str:
            return doc_path.read_text(encoding="utf-8")

        def _mp4_paths(tmp_dir: Path | None, files: list[Path] = mp4s) -> list[Path]:
            return list(files)  # ya están en disco

        yield FolderPayload(name=name, _doc_text_fn=_doc_text, _mp4_paths_fn=_mp4_paths,
                            mp4_count=len(mp4s))


def _iter_folders(args: argparse.Namespace) -> Iterator[FolderPayload]:
    if args.local_folder or args.skip_drive_download:
        root = Path(args.local_folder) if args.local_folder else Path.cwd()
        if not root.is_dir():
            raise SystemExit(f"--local-folder no es un directorio: {root}")
        log.info("modo carpeta local: %s", root)
        yield from _local_folders(root, args.only)
    else:
        log.info("modo Google Drive API: root-folder-id=%s", args.root_folder_id)
        yield from _drive_folders(args.root_folder_id, args.only)


# ─────────────────────────── Procesamiento ───────────────────────────


@dataclass
class SyncStats:
    folders: int = 0
    mp4s: int = 0
    published: int = 0
    drafts: int = 0
    failed: int = 0


def _service_account_email() -> str | None:
    """client_email del JSON del service account (best-effort, para los mensajes
    de error de acceso a Drive)."""
    import json
    import os

    path = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if not path or not Path(path).is_file():
        return None
    try:
        return json.loads(Path(path).read_text()).get("client_email")
    except (OSError, ValueError):
        return None


def _drive_error_hint(exc: Exception) -> str | None:
    """Traduce un ``googleapiclient.errors.HttpError`` a un mensaje accionable.
    Devuelve ``None`` si no es un error de Drive reconocible (el caller re-raise).

    Se detecta por nombre de clase para no importar googleapiclient acá (import
    perezoso — el módulo carga sin las deps de Drive)."""
    if type(exc).__name__ != "HttpError":
        return None
    status = getattr(getattr(exc, "resp", None), "status", None)
    text = str(exc)
    email = _service_account_email()
    who = f" ({email})" if email else ""

    if "accessNotConfigured" in text or "has not been used in project" in text:
        return (
            "Google Drive API deshabilitada en el proyecto del service account. "
            "Habilitala en https://console.cloud.google.com/apis/library/drive.googleapis.com "
            "(mismo proyecto que el JSON de credenciales), esperá 1-2 min y reintentá."
        )
    if status == 404:
        return (
            f"Folder de Drive no encontrado o sin acceso. Compartí el folder (rol Lector) "
            f"con el service account{who} y reintentá."
        )
    if status == 403:
        return (
            f"Drive devolvió 403 (acceso denegado). Verificá que el folder esté compartido "
            f"con el service account{who}.\n  detalle: {text}"
        )
    return f"Error de Google Drive: {text}"


def _process_folder(
    folder: FolderPayload, args: argparse.Namespace, stats: SyncStats
) -> None:
    try:
        parse_folder_name(folder.name)  # valida el naming (log-only)
    except ValueError as exc:
        log.warning("  %s", exc)

    try:
        doc_text = folder.doc_text()
    except Exception as exc:
        hint = _drive_error_hint(exc)
        if hint is None:
            raise
        log.error("  %s: %s — se saltea", folder.name, hint)
        stats.failed += 1
        return

    try:
        unit_json = extract_json_from_doc_text(doc_text)
    except UnitDictError as exc:
        log.error("  %s: %s — se saltea", folder.name, exc)
        stats.failed += 1
        return

    unit_json = sanitize_unit_json(unit_json)
    slug = unit_json.get("slug", "<sin-slug>")
    log.info("→ %s · slug=%s · %d video(s)", folder.name, slug, folder.mp4_count)
    stats.folders += 1
    stats.mp4s += folder.mp4_count

    if args.dry_run:
        log.info("  [DRY RUN] no se sube a R2 ni se escribe en DB")
        return

    # 1. Descargar (si Drive) + subir MP4 a R2. Un fallo acá (download de Drive
    #    o upload a R2) no debe abortar el lote — se saltea el folder.
    try:
        with tempfile.TemporaryDirectory(prefix=f"lu_{slug}_") as tmp:
            mp4_paths = folder.mp4_paths(Path(tmp))
            video_urls = [
                upload_mp4_to_r2(path, slug, i) for i, path in enumerate(mp4_paths, start=1)
            ]
    except Exception as exc:
        hint = _drive_error_hint(exc)
        log.error("  %s: fallo al descargar/subir videos: %s — se saltea", slug, hint or exc)
        stats.failed += 1
        return

    # 2. Armar dict + upsert + publish (resiliente).
    unit_dict = assemble_unit_dict(unit_json, video_urls)
    db = SessionLocal()
    try:
        unit = upsert_unit_from_dict(db, unit_dict, publish=False)
        db.flush()
        if args.no_publish:
            db.commit()
            log.info("  ✓ %s creada como borrador (--no-publish)", slug)
            stats.drafts += 1
            return
        errors = try_publish(db, unit)
        db.commit()
        if errors:
            log.warning(
                "  ⚠️  %s quedó como BORRADOR — no pasó validación de publish:\n    - %s",
                slug, "\n    - ".join(errors),
            )
            stats.drafts += 1
        else:
            log.info("  ✅ %s publicada", slug)
            stats.published += 1
    except UnitDictError as exc:
        db.rollback()
        log.error("  %s: JSON de la unit inválido: %s", slug, exc)
        stats.failed += 1
    except Exception:
        db.rollback()
        log.exception("  %s: error inesperado — se saltea", slug)
        stats.failed += 1
    finally:
        db.close()


def run(args: argparse.Namespace) -> SyncStats:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if not args.dry_run and not r2_configured():
        log.warning(
            "R2 no configurado — los video_url van a ser URLs esperadas (dry-run de "
            "upload); los MP4 no se suben de verdad. Configurá r2_* para subirlos."
        )
    stats = SyncStats()
    try:
        for folder in _iter_folders(args):
            _process_folder(folder, args, stats)
    except Exception as exc:
        hint = _drive_error_hint(exc)
        if hint is None:
            raise
        log.error(hint)
        return stats

    log.info(
        "listo · folders=%d · mp4s=%d · publicadas=%d · borradores=%d · fallidas=%d",
        stats.folders, stats.mp4s, stats.published, stats.drafts, stats.failed,
    )
    return stats


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root-folder-id", default=DEFAULT_ROOT_FOLDER_ID)
    parser.add_argument("--only", help="Sólo procesar 1 folder por nombre (ej CP-L1-P1-001)")
    parser.add_argument("--dry-run", action="store_true",
                        help="lista lo que haría; no sube a R2 ni escribe en DB")
    parser.add_argument("--local-folder",
                        help="leer sub-folders desde disco en vez de Drive API")
    parser.add_argument("--skip-drive-download", action="store_true",
                        help="no usar Drive API (implica modo carpeta local, default cwd)")
    parser.add_argument("--no-publish", action="store_true",
                        help="crear las units como borrador sin intentar publicarlas")
    run(parser.parse_args())


if __name__ == "__main__":
    main()
