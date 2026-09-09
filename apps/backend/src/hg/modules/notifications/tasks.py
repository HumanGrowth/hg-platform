"""notifications Celery tasks.

`send_engagement_reminders` es el motor de recordatorios de "seguí aprendiendo"
(rediseño colaborador · features nuevos): avisa por email cuando alguien lleva
un tramo sin tocar contenido, o cuando un módulo que le asignó su manager está
por vencer. Corre diario vía Celery beat (ver `hg.celery_app`).

Cadencia (decidida con Andy):
- **Inactividad**: a los 7 y a los 21 días sin actividad de aprendizaje, un
  máximo de un email por episodio de inactividad (se "resetea" al volver a
  tener actividad).
- **Due date**: 3 días antes de vencer y el día que vence, por asignación.

"Actividad" acá es actividad de APRENDIZAJE (LearningUnitAttempt/BlockProgress
vía `activity_by_users`), la misma fuente que ya usa el semáforo del dashboard
de equipo (`INACTIVE_DAYS`) — no el último login. Alguien puede loguearse sin
tocar un módulo; lo que queremos reactivar es lo segundo.

Corre como `hg_superadmin` (bypassa RLS): recorre usuarios de TODAS las orgs,
no una request con contexto de tenant — mismo patrón que
`hg.modules.identity.tasks.update_last_active`.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from hg.celery_app import celery_app
from hg.config import get_settings
from hg.db import SessionLocal
from hg.modules.identity.models import User
from hg.modules.learning_units.models import LearningUnit, ModuleAssignment
from hg.modules.notifications import engagement_content as content
from hg.modules.notifications.email_service import email_service
from hg.modules.notifications.models import EngagementReminder
from hg.modules.people.service import INACTIVE_DAYS, activity_by_users

log = logging.getLogger("hg.notifications.engagement")

# Umbrales de inactividad, del más fuerte al más suave — se evalúan en ese
# orden para que alguien ausente hace 30 días reciba el aviso de 21d, no el de
# 7d (que técnicamente también aplicaría).
_INACTIVITY_THRESHOLDS: list[tuple[int, str]] = [
    (INACTIVE_DAYS, "inactivity_21d"),  # 21
    (7, "inactivity_7d"),
]
_DUE_SOON_WINDOW_DAYS = 3


def _already_sent(db: Session, user_id: UUID, kind: str, since: datetime) -> bool:
    return (
        db.scalar(
            select(EngagementReminder.id).where(
                EngagementReminder.user_id == user_id,
                EngagementReminder.kind == kind,
                EngagementReminder.sent_at >= since,
            ).limit(1)
        )
        is not None
    )


def _already_sent_for_reference(db: Session, user_id: UUID, kind: str, reference_id: UUID) -> bool:
    return (
        db.scalar(
            select(EngagementReminder.id).where(
                EngagementReminder.user_id == user_id,
                EngagementReminder.kind == kind,
                EngagementReminder.reference_id == reference_id,
            ).limit(1)
        )
        is not None
    )


def _log(db: Session, *, org_id: UUID, user_id: UUID, kind: str, reference_id: UUID | None = None) -> None:
    db.add(
        EngagementReminder(org_id=org_id, user_id=user_id, kind=kind, reference_id=reference_id)
    )
    db.flush()


def _run_inactivity_reminders(db: Session) -> int:
    settings = get_settings()
    users = list(db.scalars(select(User).where(User.is_active.is_(True))).all())
    if not users:
        return 0
    aggs = activity_by_users(db, [u.id for u in users])
    now = datetime.now(UTC)
    sent = 0

    for user in users:
        agg = aggs[user.id]
        if agg.last_active_at is None:
            continue  # nunca tocó contenido — no hay "inactividad" que avisar todavía
        days_inactive = (now - agg.last_active_at).days

        for threshold, kind in _INACTIVITY_THRESHOLDS:
            if days_inactive < threshold:
                continue
            if _already_sent(db, user.id, kind, since=agg.last_active_at):
                break  # ya se avisó de ESTE episodio; no bajar al umbral más chico
            status = email_service.send(
                to=user.email,
                subject=content.inactivity_headline(kind, days_inactive),
                template="engagement_reminder",
                context={
                    "nombre": user.full_name.split(" ")[0],
                    "headline": content.inactivity_headline(kind, days_inactive),
                    "subtext": content.inactivity_subtext(kind),
                    "insight": content.why_keep_learning(str(user.id)),
                    "cta_label": "Seguir aprendiendo",
                    "cta_url": f"{settings.app_base_url}/modulos",
                },
            )
            log.info(
                "engagement.inactivity_reminder",
                extra={"user_id": str(user.id), "kind": kind, "days": days_inactive, "status": status},
            )
            # Solo se loguea si REALMENTE se mandó — "skipped" (flag off en
            # dev/staging) no debe bloquear el envío real el día que se prenda
            # el flag en ese ambiente.
            if status == "sent":
                _log(db, org_id=user.org_id, user_id=user.id, kind=kind)
                sent += 1
            break  # un solo email de inactividad por usuario por corrida
    return sent


def _run_due_date_reminders(db: Session) -> int:
    settings = get_settings()
    now = datetime.now(UTC)
    rows = db.execute(
        select(ModuleAssignment, LearningUnit, User)
        .join(LearningUnit, LearningUnit.id == ModuleAssignment.learning_unit_id)
        .join(User, User.id == ModuleAssignment.user_id)
        .where(
            ModuleAssignment.status != "completed",
            ModuleAssignment.due_date.is_not(None),
            User.is_active.is_(True),
        )
    ).all()
    sent = 0

    for assignment, unit, user in rows:
        due_date = assignment.due_date
        assert due_date is not None  # filtrado arriba
        delta_days = (due_date.date() - now.date()).days
        if delta_days == 0:
            kind = "assignment_due_today"
        elif 0 < delta_days <= _DUE_SOON_WINDOW_DAYS:
            kind = "assignment_due_soon"
        else:
            continue  # vencido de hace rato, o falta más de la ventana — nada que avisar hoy

        if _already_sent_for_reference(db, user.id, kind, assignment.id):
            continue
        status = email_service.send(
            to=user.email,
            subject=content.due_headline(kind, unit.title),
            template="engagement_reminder",
            context={
                "nombre": user.full_name.split(" ")[0],
                "headline": content.due_headline(kind, unit.title),
                "subtext": content.due_subtext(kind),
                "insight": content.why_keep_learning(str(assignment.id)),
                "cta_label": "Ir al módulo",
                "cta_url": f"{settings.app_base_url}/modulos/{unit.slug}",
            },
        )
        log.info(
            "engagement.due_date_reminder",
            extra={
                "user_id": str(user.id), "assignment_id": str(assignment.id),
                "kind": kind, "status": status,
            },
        )
        if status == "sent":
            _log(db, org_id=user.org_id, user_id=user.id, kind=kind, reference_id=assignment.id)
            sent += 1
    return sent


@celery_app.task(name="notifications.send_engagement_reminders", ignore_result=True)
def send_engagement_reminders() -> dict[str, int]:
    db = SessionLocal()
    try:
        db.begin()
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        inactivity_sent = _run_inactivity_reminders(db)
        due_date_sent = _run_due_date_reminders(db)
        db.commit()
        log.info(
            "engagement.run_complete",
            extra={"inactivity_sent": inactivity_sent, "due_date_sent": due_date_sent},
        )
        return {"inactivity_sent": inactivity_sent, "due_date_sent": due_date_sent}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
