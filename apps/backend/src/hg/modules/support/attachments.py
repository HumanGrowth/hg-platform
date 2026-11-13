"""Adjuntos de tickets de soporte (ADR-0015, addendum SP-03).

Los archivos se guardan en Postgres (``support_ticket_attachments.data``), no en R2: el bucket
público (``r2_public_base_url``) expondría screenshots con datos personales. Acá se valida lo que
llega — el tipo se decide por los *magic bytes*, nunca por el ``Content-Type`` ni la extensión que
declara el cliente.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

from fastapi import HTTPException, UploadFile, status

MAX_FILES = 3
MAX_BYTES = 5 * 1024 * 1024  # por archivo

_TEXT_EXTENSIONS = {"txt": "text/plain", "log": "text/plain", "csv": "text/csv", "json": "application/json"}
_UNSAFE_NAME = re.compile(r"[\x00-\x1f\x7f/\\\"<>|:*?]+")


@dataclass(frozen=True)
class ValidatedFile:
    filename: str
    content_type: str
    data: bytes


def _sniff(filename: str, data: bytes) -> str | None:
    """Tipo MIME según el contenido; None si no es un formato permitido (no SVG, no HTML)."""
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "image/gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    if data.startswith(b"%PDF-"):
        return "application/pdf"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext in _TEXT_EXTENSIONS and b"\x00" not in data:
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            return None
        return _TEXT_EXTENSIONS[ext]
    return None


def clean_filename(raw: str | None) -> str:
    name = _UNSAFE_NAME.sub("_", (raw or "").strip())[-120:].strip(" .")
    return name or "archivo"


def validate_uploads(files: list[UploadFile]) -> list[ValidatedFile]:
    """Valida cantidad, tamaño y tipo. Lanza 413/422 con un ``detail`` corto y estable."""
    real = [f for f in files if f.filename]
    if len(real) > MAX_FILES:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="too many attachments")
    out: list[ValidatedFile] = []
    for f in real:
        data = f.file.read(MAX_BYTES + 1)
        if len(data) > MAX_BYTES:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="attachment too large")
        if not data:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="empty attachment")
        name = clean_filename(f.filename)
        content_type = _sniff(name, data)
        if content_type is None:
            raise HTTPException(
                status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="attachment type not allowed"
            )
        out.append(ValidatedFile(filename=name, content_type=content_type, data=data))
    return out
