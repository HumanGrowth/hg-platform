"""Celery application — broker, result backend and task autodiscovery."""
from __future__ import annotations

from celery import Celery
from celery.schedules import crontab

from hg.config import get_settings

settings = get_settings()

celery_app = Celery(
    "hg",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "hg.modules.identity.tasks",
        "hg.modules.notifications.tasks",
        "hg.modules.learning.tasks",
        "hg.modules.analytics.tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Costa_Rica",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,
    worker_max_tasks_per_child=200,
    # Requiere un proceso `celery beat` corriendo aparte del worker (ver
    # docker-compose.yml servicio `beat`; en Railway necesita su propio
    # servicio con el comando de beat — no lo levanta el worker solo).
    beat_schedule={
        "send-engagement-reminders-daily": {
            "task": "notifications.send_engagement_reminders",
            # 09:00 hora Costa Rica — mañana, antes de que arranque el día.
            "schedule": crontab(hour=9, minute=0),
        },
    },
)
