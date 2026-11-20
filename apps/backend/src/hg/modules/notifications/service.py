"""Servicio de notificaciones (ADR-0018): preferencias + compuerta única de envío.

Dos piezas:

- **Preferencias** (``get_preferences`` / ``set_preferences``): lo que la persona decide
  desde su Perfil. Cada cambio queda en ``consent_change_log`` (append-only).
- **Compuerta** (``NotificationGate``): decide si un aviso de aprendizaje o un resumen
  del líder puede salir. Reglas, en orden: estado de la empresa → preferencia de la
  persona → tope de frecuencia. Los avisos transaccionales (invitación, contraseña,
  soporte, licencias) NO pasan por acá: se envían siempre.

La compuerta carga todo por lotes al construirse (``build``) y después responde en memoria:
sin N+1 en el recorrido de usuarios. ``record`` actualiza ese estado en memoria tras cada
envío, así una misma corrida no manda dos avisos a la misma persona.
"""
from __future__ import annotations

from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Final
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.consent.models import ConsentChangeLog
from hg.modules.identity.models import Company, User
from hg.modules.notifications.models import EngagementReminder, NotificationPreference

# ─────────────────────────── Tipos de aviso ───────────────────────────

# Avisos de la categoría "aprendizaje": apagables y sujetos al tope semanal.
LEARNING_KINDS: Final[frozenset[str]] = frozenset(
    {
        "inactivity_7d",
        "inactivity_21d",
        "assignment_due_soon",
        "assignment_due_today",
        "content_unlocked",
    }
)
LEADER_DIGEST_KIND: Final = "leader_weekly_digest"

# ─────────────────────────── Reglas ───────────────────────────

# Solo estas empresas reciben avisos: en gracia/suspendida/terminada el contenido
# no está disponible (ADR-0016) y "Seguí aprendiendo" sería engañoso.
ALLOWED_COMPANY_STATUSES: Final[frozenset[str]] = frozenset({"trial", "active"})

# Decisión de Andrés (2026-11-19): un aviso de aprendizaje por persona por semana.
LEARNING_CAP: Final = timedelta(days=7)
# Kinds que se saltan el tope. Vacío a propósito: decisión de producto pendiente
# (p. ej. eximir "assignment_due_today"). No requiere migración.
CAP_EXEMPT_KINDS: Final[frozenset[str]] = frozenset()

# Un resumen por semana: 6 días deja margen para que el envío del lunes siguiente no
# se descarte por una diferencia de minutos.
DIGEST_MIN_INTERVAL: Final = timedelta(days=6)
# Con menos reportes directos, los totales identificarían a una persona.
# Valor provisional, pendiente de confirmación de Andrés (ADR-0018).
DIGEST_MIN_TEAM_SIZE: Final = 3

# Scopes en consent_change_log (columna String(16)).
SCOPE_LEARNING: Final = "notif_learning"
SCOPE_DIGEST: Final = "notif_digest"

# Motivos de omisión (se loguean; no van al usuario).
SKIP_COMPANY_STATUS: Final = "company_status"
SKIP_OPTED_OUT: Final = "opted_out"
SKIP_WEEKLY_CAP: Final = "weekly_cap"
SKIP_DIGEST_RECENT: Final = "digest_recent"

_CHUNK = 1000


def _chunks(ids: list[UUID]) -> Iterator[list[UUID]]:
    for i in range(0, len(ids), _CHUNK):
        yield ids[i : i + _CHUNK]


# ─────────────────────────── Preferencias ───────────────────────────


def _allows_learning(pref: NotificationPreference | None) -> bool:
    """¿La persona acepta recordatorios de aprendizaje?

    ``None`` (nunca decidió) cuenta como permitido (ADR-0018 §8, pendiente de criterio
    legal). Pasar a opt-in explícito = cambiar solo esta función.
    """
    return pref is None or pref.learning_reminders is not False


def _allows_digest(pref: NotificationPreference | None) -> bool:
    """¿La persona acepta el resumen semanal del líder? Misma regla que arriba."""
    return pref is None or pref.leader_digest is not False


def get_preferences(db: Session, user_id: UUID) -> NotificationPreference | None:
    return db.scalar(
        select(NotificationPreference).where(NotificationPreference.user_id == user_id)
    )


def set_preferences(
    db: Session, *, user: User, learning_reminders: bool, leader_digest: bool
) -> NotificationPreference:
    """Upsert de las preferencias + un registro de auditoría por cada scope que cambió.

    Usa ``db.flush()``: el commit lo hace la dependencia al final del request.
    """
    row = get_preferences(db, user.id)
    if row is None:
        row = NotificationPreference(org_id=user.org_id, user_id=user.id)
        db.add(row)
    for scope, new_value, old_value in (
        (SCOPE_LEARNING, learning_reminders, row.learning_reminders),
        (SCOPE_DIGEST, leader_digest, row.leader_digest),
    ):
        if old_value != new_value:
            db.add(
                ConsentChangeLog(
                    org_id=user.org_id, user_id=user.id, scope=scope, value=new_value
                )
            )
    row.learning_reminders = learning_reminders
    row.leader_digest = leader_digest
    db.flush()
    return row


# ─────────────────────────── Compuerta ───────────────────────────


@dataclass
class NotificationGate:
    """Decide si un aviso puede salir. Construir con ``NotificationGate.build``."""

    now: datetime
    _prefs: dict[UUID, NotificationPreference] = field(default_factory=dict)
    _company_status: dict[UUID, str] = field(default_factory=dict)
    _last_learning: dict[UUID, datetime] = field(default_factory=dict)
    _last_digest: dict[UUID, datetime] = field(default_factory=dict)

    @classmethod
    def build(
        cls, db: Session, user_ids: Iterable[UUID], *, now: datetime | None = None
    ) -> NotificationGate:
        """Carga por lotes preferencias, estado de empresa y últimos envíos."""
        gate = cls(now=now or datetime.now(UTC))
        ids = list(dict.fromkeys(user_ids))
        for chunk in _chunks(ids):
            for pref in db.scalars(
                select(NotificationPreference).where(NotificationPreference.user_id.in_(chunk))
            ).all():
                gate._prefs[pref.user_id] = pref
            for uid, status in db.execute(
                select(User.id, Company.status)
                .join(Company, Company.id == User.company_id)
                .where(User.id.in_(chunk))
            ).all():
                gate._company_status[uid] = status
            for uid, kind, last in db.execute(
                select(
                    EngagementReminder.user_id,
                    EngagementReminder.kind,
                    func.max(EngagementReminder.sent_at),
                )
                .where(
                    EngagementReminder.user_id.in_(chunk),
                    EngagementReminder.kind.in_([*LEARNING_KINDS, LEADER_DIGEST_KIND]),
                )
                .group_by(EngagementReminder.user_id, EngagementReminder.kind)
            ).all():
                target = gate._last_digest if kind == LEADER_DIGEST_KIND else gate._last_learning
                current = target.get(uid)
                if current is None or last > current:
                    target[uid] = last
        return gate

    def _company_ok(self, user_id: UUID) -> bool:
        # Fallo cerrado: si no se puede resolver el estado, no se envía.
        return self._company_status.get(user_id) in ALLOWED_COMPANY_STATUSES

    def check_learning(self, user_id: UUID, kind: str) -> str | None:
        """``None`` si el aviso puede salir; si no, el motivo de omisión."""
        if not self._company_ok(user_id):
            return SKIP_COMPANY_STATUS
        if not _allows_learning(self._prefs.get(user_id)):
            return SKIP_OPTED_OUT
        if kind not in CAP_EXEMPT_KINDS:
            last = self._last_learning.get(user_id)
            if last is not None and self.now - last < LEARNING_CAP:
                return SKIP_WEEKLY_CAP
        return None

    def check_leader_digest(self, user_id: UUID) -> str | None:
        """``None`` si el resumen puede salir; si no, el motivo de omisión."""
        if not self._company_ok(user_id):
            return SKIP_COMPANY_STATUS
        if not _allows_digest(self._prefs.get(user_id)):
            return SKIP_OPTED_OUT
        last = self._last_digest.get(user_id)
        if last is not None and self.now - last < DIGEST_MIN_INTERVAL:
            return SKIP_DIGEST_RECENT
        return None

    def record(self, user_id: UUID, kind: str) -> None:
        """Anota en memoria un envío recién hecho (el log en DB lo escribe el task)."""
        if kind == LEADER_DIGEST_KIND:
            self._last_digest[user_id] = self.now
        else:
            self._last_learning[user_id] = self.now
