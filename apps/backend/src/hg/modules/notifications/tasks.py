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
- **Tope (ADR-0018)**: un solo aviso de aprendizaje por persona cada 7 días, sumando
  todos los tipos. Dentro de una corrida el orden es vencimientos primero, luego
  inactividad: si ambos aplican, gana el que tiene fecha.

Todo aviso de aprendizaje pasa por `NotificationGate` (`hg.modules.notifications.service`):
estado de la empresa, preferencia de la persona y tope semanal. Los avisos
transaccionales (invitación, contraseña, soporte, licencias) no pasan por acá.

`send_leader_weekly_digest` manda a cada manager un resumen semanal con totales de su
equipo directo (nunca nombres ni datos del assessment).

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
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from hg.celery_app import celery_app
from hg.config import get_settings
from hg.db import SessionLocal
from hg.modules.identity.models import User, UserRole
from hg.modules.learning_units.assignment_status import assignment_completed_clause
from hg.modules.learning_units.models import LearningUnit, ModuleAssignment
from hg.modules.learning_units.onboarding import is_content_restricted
from hg.modules.notifications import engagement_content as content
from hg.modules.notifications.email_service import email_service
from hg.modules.notifications.models import EngagementReminder
from hg.modules.notifications.service import (
    DIGEST_MIN_TEAM_SIZE,
    LEADER_DIGEST_KIND,
    NotificationGate,
)
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
# Ventana de "tuvo actividad" del resumen semanal del líder.
_DIGEST_ACTIVE_DAYS = 7


def _active_since(last_active_at: datetime | None, since: datetime) -> bool:
    return last_active_at is not None and last_active_at >= since


def _prefs_url() -> str:
    """Enlace a la pantalla de preferencias (Perfil)."""
    return f"{get_settings().app_base_url}/perfil"


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


def _run_inactivity_reminders(db: Session, gate: NotificationGate | None = None) -> int:
    settings = get_settings()
    users = list(db.scalars(select(User).where(User.is_active.is_(True))).all())
    if not users:
        return 0
    gate = gate or NotificationGate.build(db, [u.id for u in users])
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
            skip = gate.check_learning(user.id, kind)
            if skip is not None:
                log.info(
                    "engagement.skipped",
                    extra={"user_id": str(user.id), "kind": kind, "reason": skip},
                )
                break  # cuando se libere el tope, se manda el aviso que corresponda entonces
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
                    "prefs_url": _prefs_url(),
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
                gate.record(user.id, kind)
                sent += 1
            break  # un solo email de inactividad por usuario por corrida
    return sent


def _run_due_date_reminders(db: Session, gate: NotificationGate | None = None) -> int:
    settings = get_settings()
    now = datetime.now(UTC)
    rows = db.execute(
        select(ModuleAssignment, LearningUnit, User)
        .join(LearningUnit, LearningUnit.id == ModuleAssignment.learning_unit_id)
        .join(User, User.id == ModuleAssignment.user_id)
        .where(
            ~assignment_completed_clause(),
            ModuleAssignment.due_date.is_not(None),
            User.is_active.is_(True),
        )
    ).all()
    if not rows:
        return 0
    gate = gate or NotificationGate.build(db, [user.id for _, _, user in rows])
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
        skip = gate.check_learning(user.id, kind)
        if skip is not None:
            log.info(
                "engagement.skipped",
                extra={
                    "user_id": str(user.id), "assignment_id": str(assignment.id),
                    "kind": kind, "reason": skip,
                },
            )
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
                "prefs_url": _prefs_url(),
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
            gate.record(user.id, kind)
            sent += 1
    return sent


CONTENT_UNLOCKED_KIND = "content_unlocked"
_RESTRICTABLE_ROLES = ("collaborator", "manager")


def notify_content_unlocked(
    db: Session, users: list[User], gate: NotificationGate | None = None
) -> int:
    """Avisa por email a quienes estaban esperando su primera asignación (ver
    `learning_units/onboarding.py`) y ya la recibieron. Una sola vez por user
    (`EngagementReminder` kind=content_unlocked). No avisa a quien ya empezó a
    consumir contenido: ya sabe que tiene módulos. Idempotente: se llama tanto
    al asignar como en el barrido periódico."""
    settings = get_settings()
    already = set(
        db.scalars(
            select(EngagementReminder.user_id).where(
                EngagementReminder.kind == CONTENT_UNLOCKED_KIND,
                EngagementReminder.user_id.in_([u.id for u in users]),
            )
        ).all()
    )
    candidates = [
        u for u in users
        if u.is_active and u.role.value in _RESTRICTABLE_ROLES
        and u.id not in already
    ]
    if not candidates:
        return 0
    gate = gate or NotificationGate.build(db, [u.id for u in candidates])
    aggs = activity_by_users(db, [u.id for u in candidates])
    sent = 0
    for user in candidates:
        if aggs[user.id].last_active_at is not None or is_content_restricted(db, user):
            continue
        skip = gate.check_learning(user.id, CONTENT_UNLOCKED_KIND)
        if skip is not None:
            log.info(
                "engagement.skipped",
                extra={"user_id": str(user.id), "kind": CONTENT_UNLOCKED_KIND, "reason": skip},
            )
            continue
        status = email_service.send(
            to=user.email,
            subject="Tu organización ya te asignó módulos",
            template="engagement_reminder",
            context={
                "nombre": user.full_name.split(" ")[0],
                "headline": "Ya tenés módulos asignados",
                "subtext": "Tu organización te asignó contenido en HumanGrowth. Ya podés ver tu ruta completa.",
                "insight": content.why_keep_learning(str(user.id)),
                "cta_label": "Ver mis módulos",
                "cta_url": f"{settings.app_base_url}/modulos",
                "prefs_url": _prefs_url(),
            },
        )
        log.info(
            "engagement.content_unlocked",
            extra={"user_id": str(user.id), "status": status},
        )
        # Igual que el resto: "skipped" (flag off) no se registra, para no
        # bloquear el envío real cuando se prenda el flag.
        if status == "sent":
            _log(db, org_id=user.org_id, user_id=user.id, kind=CONTENT_UNLOCKED_KIND)
            gate.record(user.id, CONTENT_UNLOCKED_KIND)
            sent += 1
    return sent


def _run_leader_digests(db: Session, gate: NotificationGate | None = None) -> int:
    """Resumen semanal a cada manager con al menos ``DIGEST_MIN_TEAM_SIZE`` reportes
    directos activos. Solo totales: nunca nombres ni datos del assessment (ADR-0018)."""
    settings = get_settings()
    managers = list(
        db.scalars(
            select(User).where(User.is_active.is_(True), User.role == UserRole.manager)
        ).all()
    )
    if not managers:
        return 0
    gate = gate or NotificationGate.build(db, [m.id for m in managers])

    reports_by_manager: dict[UUID, list[UUID]] = {}
    for report_id, manager_id in db.execute(
        select(User.id, User.manager_id).where(
            User.is_active.is_(True),
            User.manager_id.in_([m.id for m in managers]),
        )
    ).all():
        if manager_id is None:  # no ocurre por el filtro; deja tranquilo al type checker
            continue
        reports_by_manager.setdefault(manager_id, []).append(report_id)

    all_report_ids = [rid for ids in reports_by_manager.values() for rid in ids]
    aggs = activity_by_users(db, all_report_ids)
    window_start = gate.now - timedelta(days=_DIGEST_ACTIVE_DAYS)
    sent = 0

    for manager in managers:
        report_ids = reports_by_manager.get(manager.id, [])
        if len(report_ids) < DIGEST_MIN_TEAM_SIZE:
            continue  # con menos reportes, los totales identificarían a una persona
        skip = gate.check_leader_digest(manager.id)
        if skip is not None:
            log.info(
                "engagement.skipped",
                extra={"user_id": str(manager.id), "kind": LEADER_DIGEST_KIND, "reason": skip},
            )
            continue
        active = sum(1 for rid in report_ids if _active_since(aggs[rid].last_active_at, window_start))
        inactive = sum(1 for rid in report_ids if aggs[rid].is_inactive)
        team_size = len(report_ids)
        status = email_service.send(
            to=manager.email,
            subject=content.digest_subject(),
            template="leader_weekly_digest",
            context={
                "nombre": manager.full_name.split(" ")[0],
                "headline": content.digest_headline(active, team_size),
                "inactive_line": content.digest_inactive_line(inactive),
                "cta_label": "Ver mi equipo",
                "cta_url": f"{settings.app_base_url}/team",
                "prefs_url": _prefs_url(),
            },
        )
        log.info(
            "engagement.leader_digest",
            extra={
                "user_id": str(manager.id), "team_size": team_size,
                "active": active, "inactive": inactive, "status": status,
            },
        )
        if status == "sent":
            _log(db, org_id=manager.org_id, user_id=manager.id, kind=LEADER_DIGEST_KIND)
            gate.record(manager.id, LEADER_DIGEST_KIND)
            sent += 1
    return sent


@celery_app.task(name="notifications.send_content_unlocked", ignore_result=True)
def send_content_unlocked() -> dict[str, int]:
    """Barrido: cubre lo que no pasa por una asignación directa (rutas custom
    por org/empresa o asignadas a miembros)."""
    db = SessionLocal()
    try:
        db.begin()
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        users = list(
            db.scalars(select(User).where(User.is_active.is_(True))).all()
        )
        sent = notify_content_unlocked(db, users)
        db.commit()
        log.info("engagement.content_unlocked_run", extra={"sent": sent})
        return {"sent": sent}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="notifications.send_engagement_reminders", ignore_result=True)
def send_engagement_reminders() -> dict[str, int]:
    db = SessionLocal()
    try:
        db.begin()
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        # Una sola compuerta para toda la corrida: vencimientos primero, así que si una
        # persona califica para ambos avisos, el tope semanal deja pasar el que tiene fecha.
        active_ids = list(db.scalars(select(User.id).where(User.is_active.is_(True))).all())
        gate = NotificationGate.build(db, active_ids)
        due_date_sent = _run_due_date_reminders(db, gate)
        inactivity_sent = _run_inactivity_reminders(db, gate)
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


@celery_app.task(name="notifications.send_leader_weekly_digest", ignore_result=True)
def send_leader_weekly_digest() -> dict[str, int]:
    """Resumen semanal del líder (lunes, ver beat en `hg.celery_app`)."""
    db = SessionLocal()
    try:
        db.begin()
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        sent = _run_leader_digests(db)
        db.commit()
        log.info("engagement.leader_digest_run", extra={"sent": sent})
        return {"sent": sent}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
