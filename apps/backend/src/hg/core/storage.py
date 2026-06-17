"""Cliente Cloudflare R2 (S3-compatible) + helpers de upload.

R2 se expone vía la API S3 en ``https://{account_id}.r2.cloudflarestorage.com``.
Las URLs públicas se sirven desde ``r2_public_base_url`` (ej. CDN
``https://cdn.humangrowth.io/``).

Si faltan credenciales R2 (config vacía), :func:`r2_configured` devuelve False
y los scripts deben operar en **dry-run** (no subir, sólo generar manifest).
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import TYPE_CHECKING

import boto3
from botocore.client import Config as BotoConfig

from hg.config import get_settings

if TYPE_CHECKING:
    from mypy_boto3_s3 import S3Client  # pragma: no cover

log = logging.getLogger("hg.storage")


def r2_configured() -> bool:
    """True sólo si las 4 credenciales + base pública están presentes."""
    s = get_settings()
    return bool(
        s.r2_account_id
        and s.r2_access_key_id
        and s.r2_secret_access_key
        and s.r2_public_base_url
    )


def get_r2_client() -> S3Client:
    """Cliente boto3 S3 apuntando al endpoint R2 de la cuenta."""
    s = get_settings()
    endpoint = f"https://{s.r2_account_id}.r2.cloudflarestorage.com"
    return boto3.client(
        "s3",
        endpoint_url=endpoint,
        aws_access_key_id=s.r2_access_key_id,
        aws_secret_access_key=s.r2_secret_access_key,
        config=BotoConfig(signature_version="s3v4"),
        region_name="auto",
    )


def _public_url(key: str) -> str:
    base = get_settings().r2_public_base_url.rstrip("/")
    return f"{base}/{key.lstrip('/')}"


def upload_file(local_path: Path, key: str, content_type: str) -> str:
    """Sube un archivo local a R2 bajo ``key``; devuelve la URL pública.

    En dry-run (sin credenciales) loguea y devuelve la URL pública esperada
    sin subir nada.
    """
    if not r2_configured():
        log.warning("r2.skip_upload key=%s (R2 no configurado — dry-run)", key)
        return _public_url(key)
    client = get_r2_client()
    bucket = get_settings().r2_bucket
    client.upload_file(
        str(local_path), bucket, key, ExtraArgs={"ContentType": content_type}
    )
    log.info("r2.uploaded key=%s", key)
    return _public_url(key)


def upload_bytes(data: bytes, key: str, content_type: str) -> str:
    """Sube ``data`` a R2 bajo ``key``; devuelve la URL pública (dry-run safe)."""
    if not r2_configured():
        log.warning("r2.skip_upload key=%s (R2 no configurado — dry-run)", key)
        return _public_url(key)
    client = get_r2_client()
    bucket = get_settings().r2_bucket
    client.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
    log.info("r2.uploaded key=%s (%d bytes)", key, len(data))
    return _public_url(key)
