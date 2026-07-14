"""YouTube URL/ID parsing + thumbnail helper (TASK A-06).

.. deprecated:: lu-refine-A-02
    YouTube embed salió de scope para Learning Units (reemplazado por
    ``video_url`` apuntando a un MP4 en R2 — mismo pattern que ``events``).
    Ningún código productivo importa este módulo desde lu-refine-A-02 en
    adelante (``admin_router.py``/``router.py`` ya no lo referencian). Se
    mantiene el archivo sin eliminar por si hace falta parsear/migrar URLs
    de YouTube legacy más adelante; se borra en un sprint futuro si sigue
    sin uso.
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
