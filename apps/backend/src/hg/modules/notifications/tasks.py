"""notifications Celery tasks.

Placeholder: registrado en `hg.celery_app` (`include`) para que el worker
arranque. Las tasks reales de notifications se agregan en sus entregables.
"""
from __future__ import annotations

from hg.celery_app import celery_app

__all__ = ["celery_app"]
