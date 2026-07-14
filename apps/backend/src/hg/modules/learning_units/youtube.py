"""YouTube URL/ID parsing + thumbnail helper (TASK A-06).

Único host de video soportado para units (regla dura del prompt — sin R2,
sin HLS para LearningUnit). Usado en ``admin_router.py`` cuando el
POST/PATCH de un video block recibe ``youtube_video_id``: acepta URL
completa o ID directo, valida el formato, y puede auto-popular
``poster_url`` con el thumbnail si no viene explícito.
"""
from __future__ import annotations

import re
from urllib.parse import parse_qs, urlparse

YOUTUBE_ID_REGEX = re.compile(r"^[a-zA-Z0-9_-]{11}$")


def extract_youtube_video_id(url_or_id: str) -> str:
    """Acepta URL de YouTube o video ID directo. Retorna el ID de 11 chars.

    Formatos soportados: ID directo, youtube.com/watch?v=, youtube.com/embed/,
    youtube.com/shorts/, youtu.be/. Lanza ``ValueError`` si no matchea ninguno.
    """
    candidate = url_or_id.strip()
    if YOUTUBE_ID_REGEX.match(candidate):
        return candidate

    parsed = urlparse(candidate)
    host = parsed.netloc.removeprefix("www.").removeprefix("m.")

    if host == "youtube.com":
        query = parse_qs(parsed.query)
        if "v" in query and YOUTUBE_ID_REGEX.match(query["v"][0]):
            return query["v"][0]
        parts = [p for p in parsed.path.split("/") if p]
        if len(parts) >= 2 and parts[0] in ("embed", "shorts") and YOUTUBE_ID_REGEX.match(parts[1]):
            return parts[1]
    elif host == "youtu.be":
        vid = parsed.path.strip("/")
        if YOUTUBE_ID_REGEX.match(vid):
            return vid

    raise ValueError(f"No es una URL/ID de YouTube válido: {url_or_id!r}")


def youtube_thumbnail_url(video_id: str, quality: str = "hqdefault") -> str:
    """URL del thumbnail default de YouTube para ``video_id``.

    ``quality``: default | mqdefault | hqdefault | sddefault | maxresdefault.
    """
    return f"https://i.ytimg.com/vi/{video_id}/{quality}.jpg"
