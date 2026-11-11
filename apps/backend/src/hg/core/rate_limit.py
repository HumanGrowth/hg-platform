"""Limitador de tasa de ventana fija sobre Redis.

Pensado para endpoints públicos (ADR-0015). Falla **abierto**: si Redis no responde se registra
un warning y se permite la petición, porque tumbar el soporte por una caída de Redis es peor que
dejar pasar un burst. No guarda PII: los identificadores (IP, email) se hashean en la llave.
"""
from __future__ import annotations

import hashlib
import logging
import time

import redis

from hg.config import get_settings

log = logging.getLogger("hg.rate_limit")

_client: redis.Redis | None = None  # type: ignore[type-arg]


def _redis() -> redis.Redis:  # type: ignore[type-arg]
    global _client
    if _client is None:
        _client = redis.Redis.from_url(
            get_settings().redis_url,
            socket_connect_timeout=1,
            socket_timeout=1,
            decode_responses=True,
        )
    return _client


def _key(name: str, identifier: str, window_seconds: int) -> str:
    digest = hashlib.sha256(identifier.encode("utf-8")).hexdigest()[:16]
    bucket = int(time.time() // window_seconds)
    return f"rl:{name}:{digest}:{bucket}"


def allow(name: str, identifier: str, *, limit: int, window_seconds: int = 3600) -> bool:
    """Cuenta una petición y devuelve ``True`` si todavía está dentro del límite."""
    key = _key(name, identifier, window_seconds)
    try:
        pipe = _redis().pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds)
        count = pipe.execute()[0]
    except Exception:
        log.warning("rate_limit.redis_unavailable", extra={"limiter": name})
        return True
    return int(count) <= limit
