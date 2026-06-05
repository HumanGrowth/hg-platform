"""Password hashing + JWT helpers (access + refresh)."""
from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import bcrypt
import jwt

from hg.config import get_settings

settings = get_settings()

TokenType = Literal["access", "refresh"]

# bcrypt limita el secreto a 72 bytes. Usamos la librería bcrypt directamente
# (no passlib): passlib 1.7.4 es incompatible con bcrypt 5.x instalado y no hay
# forma de pinear deps en este entorno. El formato de hash ($2b$) es estándar.
_BCRYPT_MAX_BYTES = 72


def _pw_bytes(plain: str) -> bytes:
    return plain.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(_pw_bytes(plain), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_pw_bytes(plain), hashed.encode("utf-8"))
    except ValueError:
        return False


def _now() -> datetime:
    return datetime.now(UTC)


def create_token(
    *,
    user_id: UUID,
    org_id: UUID,
    role: str,
    token_type: TokenType,
    extra: dict[str, Any] | None = None,
) -> str:
    now = _now()
    ttl = (
        timedelta(minutes=settings.jwt_access_ttl_minutes)
        if token_type == "access"
        else timedelta(days=settings.jwt_refresh_ttl_days)
    )
    payload: dict[str, Any] = {
        "sub": str(user_id),
        "org_id": str(org_id),
        "role": role,
        "type": token_type,
        "iat": now,
        "exp": now + ttl,
        "jti": secrets.token_urlsafe(16),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str, *, expected_type: TokenType | None = None) -> dict[str, Any]:
    payload = jwt.decode(token, settings.secret_key, algorithms=[settings.jwt_algorithm])
    if expected_type and payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(
            f"expected token type {expected_type}, got {payload.get('type')}"
        )
    return payload


def generate_opaque_token(nbytes: int = 32) -> tuple[str, str]:
    """Genera (plaintext, sha256-hash). Plaintext se envía al usuario una sola vez."""
    plain = secrets.token_urlsafe(nbytes)
    digest = hashlib.sha256(plain.encode()).hexdigest()
    return plain, digest


def hash_opaque_token(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()
