"""Admin image upload → R2 (cierre-beta TASK 4).

`POST /admin/upload/image` (superadmin): recibe un archivo multipart, valida
tipo (por magic bytes, no por el content-type del cliente), tamaño y dimensiones,
lo sube a R2 y devuelve la URL pública. Lo usa el `<ImageUploader>` del form de
eventos, pero es genérico (reusable por cualquier form admin).
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from hg.core import storage
from hg.core.deps import require_role
from hg.modules.identity.models import User

router = APIRouter()

# content-type (canónico) → extensión. La clave es el tipo detectado por magic
# bytes; nunca confiamos en `file.content_type` que manda el cliente.
_EXT_BY_TYPE = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_MAX_DIM = 3000  # px por lado


def _sniff_image_type(data: bytes) -> str | None:
    """Detecta el tipo real por firma de bytes. ``None`` si no es JPG/PNG/WebP."""
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    return None


def _png_dims(data: bytes) -> tuple[int, int] | None:
    # IHDR va justo después de la firma (8) + len(4) + "IHDR"(4): width/height uint32 BE.
    if len(data) >= 24 and data[12:16] == b"IHDR":
        return int.from_bytes(data[16:20], "big"), int.from_bytes(data[20:24], "big")
    return None


def _jpeg_dims(data: bytes) -> tuple[int, int] | None:
    # Recorre segmentos buscando un marcador SOF (Start Of Frame) con las dims.
    i, n = 2, len(data)
    sof = {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}
    while i + 9 < n and data[i] == 0xFF:
        marker = data[i + 1]
        if marker in sof:
            h = int.from_bytes(data[i + 5:i + 7], "big")
            w = int.from_bytes(data[i + 7:i + 9], "big")
            return w, h
        seg_len = int.from_bytes(data[i + 2:i + 4], "big")
        if seg_len <= 0:
            break
        i += 2 + seg_len
    return None


def _webp_dims(data: bytes) -> tuple[int, int] | None:
    fmt = data[12:16]
    if fmt == b"VP8X" and len(data) >= 30:  # extended: canvas 24-bit +1
        w = int.from_bytes(data[24:27], "little") + 1
        h = int.from_bytes(data[27:30], "little") + 1
        return w, h
    if fmt == b"VP8 " and len(data) >= 30:  # lossy: 14-bit dims tras el start code
        w = int.from_bytes(data[26:28], "little") & 0x3FFF
        h = int.from_bytes(data[28:30], "little") & 0x3FFF
        return w, h
    if fmt == b"VP8L" and len(data) >= 25:  # lossless: 14-bit packed
        b0, b1, b2, b3 = data[21], data[22], data[23], data[24]
        w = ((b1 & 0x3F) << 8 | b0) + 1
        h = ((b3 & 0x0F) << 10 | b2 << 2 | (b1 & 0xC0) >> 6) + 1
        return w, h
    return None


def _image_dims(data: bytes, content_type: str) -> tuple[int, int] | None:
    """Dimensiones (w, h) leídas del header, o ``None`` si no se pueden parsear
    (en ese caso no bloqueamos — el tipo y el tamaño ya se validaron)."""
    try:
        if content_type == "image/png":
            return _png_dims(data)
        if content_type == "image/jpeg":
            return _jpeg_dims(data)
        if content_type == "image/webp":
            return _webp_dims(data)
    except Exception:
        return None
    return None


@router.post("/upload/image")
async def upload_image(
    file: Annotated[UploadFile, File()],
    _: Annotated[User, Depends(require_role("superadmin"))],
) -> dict[str, str]:
    # Leemos hasta MAX+1 para detectar exceso sin cargar archivos gigantes en RAM.
    data = await file.read(_MAX_BYTES + 1)
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen supera el máximo de 5 MB.",
        )
    content_type = _sniff_image_type(data)
    if content_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no soportado. Usá JPG, PNG o WebP.",
        )
    dims = _image_dims(data, content_type)
    if dims is not None and (dims[0] > _MAX_DIM or dims[1] > _MAX_DIM):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Dimensiones máximas {_MAX_DIM}x{_MAX_DIM}px (recibido {dims[0]}x{dims[1]}).",
        )
    key = f"admin-uploads/events/{uuid.uuid4().hex}.{_EXT_BY_TYPE[content_type]}"
    url = storage.upload_bytes(data, key, content_type)
    return {"url": url}
