"""Carga masiva de la estructura de una Empresa desde Excel (Capa Empresa · TASK 4,
extendida por el pre-provisioning BP-01).

Un `.xlsx` define, en una sola carga y ANTES de que nadie acepte nada:

- hoja ``Organizaciones`` (opcional): ``nombre``, ``slug`` (opcional), ``cupo_licencias``
  (opcional). Crea las que no existen y actualiza el cupo de las que sí.
- hoja ``Miembros``: ``organizacion`` (slug o nombre), ``email``, ``nombre_completo``,
  ``rol`` (manager | collaborator | admin), ``manager_email`` (opcional) y opcionales
  ``puesto`` / ``departamento``. Cada persona nueva queda como **invitado**: la cuenta ya
  está configurada (org, rol, manager) y se activa cuando acepta. NO se manda correo salvo
  que se pida (``send_invitations``); el envío es un paso explícito aparte.
- hoja ``Módulos`` (opcional): ``organizacion``, ``modulo`` (slug), ``fecha_limite``
  (opcional). Asigna el módulo a la organización: los miembros activos lo reciben ya y los
  invitados al aceptar.

Compatibilidad: un archivo de una sola hoja con las 5 columnas originales
(organizacion, email, nombre_completo, rol, manager_email) sigue siendo válido.

Es **idempotente** (por email dentro de la Empresa, por slug de org, por módulo) y
**tolerante a filas malas**: cada fila corre en un SAVEPOINT y devuelve su resultado con
motivo; jamás falla todo por una fila. Los managers se enlazan en una **segunda pasada**,
así que un manager puede ser también un invitado del mismo archivo, en cualquier fila.

``validate_only``: ejecuta TODO el proceso dentro de un SAVEPOINT exterior que se revierte,
así la vista previa es exactamente lo que haría la carga real, sin escribir ni mandar correos.
"""
from __future__ import annotations

import re
import unicodedata
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime
from io import BytesIO
from uuid import UUID, uuid4

import openpyxl
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.company import service as company_service
from hg.modules.company.schemas import CreateCompanyOrgRequest
from hg.modules.identity import service as identity_service
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Organization, User, UserRole
from hg.modules.learning_units.models import LearningUnit
from hg.modules.learning_units.org_modules import (
    apply_org_modules,
    assign_units_to_active_members,
    org_assignment_error,
    upsert_org_modules,
)
from hg.modules.notifications.tasks import notify_content_unlocked

# Columnas OBLIGATORIAS de la hoja de miembros (el formato original de 5 columnas).
MEMBER_REQUIRED = ["organizacion", "email", "nombre_completo", "rol", "manager_email"]
MEMBER_OPTIONAL = ["puesto", "departamento"]
# Encabezados de la hoja de miembros de la plantilla.
TEMPLATE_HEADERS = MEMBER_REQUIRED + MEMBER_OPTIONAL
ORG_HEADERS = ["nombre", "slug", "cupo_licencias"]
MODULE_HEADERS = ["organizacion", "modulo", "fecha_limite"]
SHEET_ORGS, SHEET_MEMBERS, SHEET_MODULES = "Organizaciones", "Miembros", "Módulos"
# MIME oficial del .xlsx (para el Content-Type de la plantilla y el upload).
XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
_ROLE_ALIASES: dict[str, UserRole] = {
    "manager": UserRole.manager,
    "collaborator": UserRole.collaborator,
    "colaborador": UserRole.collaborator,  # alias ES tolerado
    "admin": UserRole.admin,
}
_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_MAX_ROWS = 5000


@dataclass
class RowResult:
    fila: int
    email: str
    estado: str  # creado | actualizado | error
    motivo: str | None = None
    # La fila se aplicó, pero algo secundario no (p.ej. no se pudo enlazar el manager).
    aviso: str | None = None


@dataclass
class OrgResult:
    fila: int
    organizacion: str
    estado: str  # creada | actualizada | sin_cambios | error
    motivo: str | None = None


@dataclass
class ModuleResult:
    fila: int
    organizacion: str
    modulo: str
    estado: str  # asignado | sin_cambios | error
    motivo: str | None = None


@dataclass
class BulkOutcome:
    orgs: list[OrgResult] = field(default_factory=list)
    members: list[RowResult] = field(default_factory=list)
    modules: list[ModuleResult] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    validate_only: bool = False
    invitations_sent: int = 0


class BulkImportError(Exception):
    """Error de archivo completo (headers/formato) → 400, no un error por fila."""


class _RowError(Exception):
    """Error de una fila puntual → se reporta en su resultado, no aborta el lote."""


@dataclass
class _Workbook:
    orgs: list[dict[str, str]]
    members: list[dict[str, str]]
    modules: list[dict[str, str]]


# ─────────────────────────── Parseo del .xlsx ───────────────────────────


def _norm_header(h: object) -> str:
    return str(h).strip().lower() if h is not None else ""


def _norm_sheet(name: str) -> str:
    base = unicodedata.normalize("NFKD", name.strip().lower())
    return "".join(ch for ch in base if not unicodedata.combining(ch))


def _read_sheet(ws, required: list[str], optional: list[str]) -> list[dict[str, str]]:  # type: ignore[no-untyped-def]
    """Filas-dict de una hoja (headers tolerantes a orden/mayúsculas). Levanta
    ``BulkImportError`` si faltan columnas obligatorias."""
    rows_iter = ws.iter_rows(values_only=True)
    header = next(rows_iter, None)
    if header is None:
        raise BulkImportError(f"la hoja '{ws.title}' está vacía")
    norm = [_norm_header(h) for h in header]
    idx: dict[str, int] = {}
    for col in required:
        if col not in norm:
            raise BulkImportError(f"falta la columna obligatoria '{col}' en la hoja '{ws.title}'")
        idx[col] = norm.index(col)
    for col in optional:
        if col in norm:
            idx[col] = norm.index(col)

    records: list[dict[str, str]] = []
    for n, row in enumerate(rows_iter, start=2):
        if row is None or all(c is None or str(c).strip() == "" for c in row):
            continue  # fila en blanco → se ignora
        rec: dict[str, str] = dict.fromkeys(required + optional, "")
        for col, i in idx.items():
            cell = row[i] if i < len(row) else None
            if isinstance(cell, datetime):
                rec[col] = cell.date().isoformat()
            elif isinstance(cell, date):
                rec[col] = cell.isoformat()
            else:
                rec[col] = str(cell).strip() if cell is not None else ""
        rec["_fila"] = str(n)
        records.append(rec)
        if len(records) > _MAX_ROWS:
            raise BulkImportError(f"la hoja '{ws.title}' excede el máximo de {_MAX_ROWS} filas")
    return records


def _parse_workbook(content: bytes) -> _Workbook:
    try:
        wb = openpyxl.load_workbook(BytesIO(content), read_only=True, data_only=True)
    except Exception as exc:  # openpyxl levanta variados; homogeneizamos
        raise BulkImportError(f"no se pudo leer el .xlsx: {exc}") from exc

    sheets = {_norm_sheet(ws.title): ws for ws in wb.worksheets}
    ws_orgs = sheets.get(_norm_sheet(SHEET_ORGS))
    ws_members = sheets.get(_norm_sheet(SHEET_MEMBERS))
    ws_modules = sheets.get(_norm_sheet(SHEET_MODULES))
    if ws_orgs is None and ws_members is None and ws_modules is None:
        # Formato original: una sola hoja de miembros, sin nombre especial.
        ws_members = wb.active
    if ws_members is None and ws_orgs is None and ws_modules is None:
        raise BulkImportError("el archivo no tiene hojas")

    book = _Workbook(
        orgs=_read_sheet(ws_orgs, ["nombre"], ["slug", "cupo_licencias"]) if ws_orgs else [],
        members=_read_sheet(ws_members, MEMBER_REQUIRED, MEMBER_OPTIONAL) if ws_members else [],
        modules=_read_sheet(ws_modules, ["organizacion", "modulo"], ["fecha_limite"])
        if ws_modules
        else [],
    )
    if not (book.orgs or book.members or book.modules):
        raise BulkImportError("el archivo está vacío")
    return book


# ─────────────────────────── Import ───────────────────────────


def bulk_import(
    db: Session,
    *,
    company_id: UUID,
    actor: User,
    content: bytes,
    validate_only: bool = False,
    send_invitations: bool = False,
) -> BulkOutcome:
    """Procesa el `.xlsx` y devuelve el reporte. Cada fila es un SAVEPOINT
    independiente; el commit final lo hace la dependencia del router. Con
    ``validate_only`` todo se revierte y no se manda ningún correo."""
    book = _parse_workbook(content)
    if validate_only:
        send_invitations = False
    outer = db.begin_nested() if validate_only else None
    try:
        outcome = _apply(
            db, company_id=company_id, actor=actor, book=book, send_invitations=send_invitations
        )
        outcome.validate_only = validate_only
    finally:
        if outer is not None:
            outer.rollback()
    return outcome


def _apply(
    db: Session, *, company_id: UUID, actor: User, book: _Workbook, send_invitations: bool
) -> BulkOutcome:
    company = company_service._get_company(db, company_id)
    outcome = BulkOutcome()

    # 1) Organizaciones (primero: miembros y módulos pueden referirse a las nuevas).
    for rec in book.orgs:
        fila = int(rec["_fila"])
        try:
            with db.begin_nested():
                estado = _process_org(db, company_id=company_id, rec=rec)
            outcome.orgs.append(OrgResult(fila, rec["nombre"], estado))
        except _RowError as exc:
            outcome.orgs.append(OrgResult(fila, rec["nombre"], "error", str(exc)))
        except HTTPException as exc:
            outcome.orgs.append(OrgResult(fila, rec["nombre"], "error", str(exc.detail)))

    orgs = list(
        db.scalars(select(Organization).where(Organization.company_id == company_id)).all()
    )
    by_slug = {o.slug.strip().lower(): o for o in orgs}
    by_name = {o.name.strip().lower(): o for o in orgs}

    # 2) Miembros, pasada 1: cuentas (invitadas o existentes) sin manager todavía.
    pool_total = company.licenses_total
    state = {"pool_used": identity_service.company_active_users(db, company_id)}
    file_index = _index_file_members(book.members, by_slug, by_name)
    touched: dict[str, tuple[UUID, str, RowResult]] = {}  # email → (user_id, manager_email, fila)
    seen: set[str] = set()
    for rec in book.members:
        fila = int(rec["_fila"])
        email = rec["email"].strip().lower()
        if not email:
            outcome.members.append(RowResult(fila, "", "error", "email vacío"))
            continue
        if email in seen:
            outcome.members.append(
                RowResult(fila, email, "error", "email duplicado en el archivo")
            )
            continue
        seen.add(email)
        try:
            with db.begin_nested():
                estado, consumed, user = _process_member(
                    db, company_id=company_id, rec=rec, email=email, by_slug=by_slug,
                    by_name=by_name, file_index=file_index, pool_total=pool_total,
                    pool_used=state["pool_used"],
                )
        except _RowError as exc:
            outcome.members.append(RowResult(fila, email, "error", str(exc)))
            continue
        except HTTPException as exc:
            outcome.members.append(RowResult(fila, email, "error", str(exc.detail)))
            continue
        if consumed:
            state["pool_used"] += 1
        result = RowResult(fila, email, estado)
        outcome.members.append(result)
        touched[email] = (user.id, rec["manager_email"].strip().lower(), result)

    # 3) Miembros, pasada 2: enlazar managers (ya existen todas las cuentas del archivo).
    for user_id, manager_email, result in touched.values():
        if not manager_email:
            continue
        try:
            with db.begin_nested():
                _link_manager(db, user_id=user_id, manager_email=manager_email)
        except _RowError as exc:
            result.aviso = f"manager no asignado: {exc}"

    # 4) Módulos por organización.
    notify: dict[UUID, User] = {}
    for rec in book.modules:
        fila = int(rec["_fila"])
        try:
            with db.begin_nested():
                estado, newly = _process_module(
                    db, company_id=company_id, actor=actor, rec=rec, by_slug=by_slug,
                    by_name=by_name,
                )
            outcome.modules.append(ModuleResult(fila, rec["organizacion"], rec["modulo"], estado))
            for u in newly:
                notify[u.id] = u
        except _RowError as exc:
            outcome.modules.append(
                ModuleResult(fila, rec["organizacion"], rec["modulo"], "error", str(exc))
            )
        except HTTPException as exc:
            outcome.modules.append(
                ModuleResult(fila, rec["organizacion"], rec["modulo"], "error", str(exc.detail))
            )

    outcome.warnings = _license_warnings(db, company_id, company.licenses_total)

    if send_invitations:
        from hg.modules.company import invite_service

        ids = [uid for uid, _m, _r in touched.values()]
        sent, failed = invite_service.send_to_users(
            db, actor=actor, user_ids=ids, only_unsent=True
        )
        outcome.invitations_sent = sent
        for email, reason in failed.items():
            if email in touched:
                touched[email][2].aviso = f"invitación no enviada: {reason}"
        if notify:
            notify_content_unlocked(db, list(notify.values()))
    elif notify:
        # Sin envío de invitaciones igual se avisa a los ACTIVOS a quienes se les
        # desbloqueó contenido (mismo comportamiento que asignar desde el panel).
        notify_content_unlocked(db, list(notify.values()))
    return outcome


# ─────────────────────────── Organizaciones ───────────────────────────


def _slugify(name: str) -> str:
    base = unicodedata.normalize("NFKD", name.strip().lower())
    base = "".join(ch for ch in base if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", "-", base).strip("-")[:90] or "org"


def _process_org(db: Session, *, company_id: UUID, rec: dict[str, str]) -> str:
    name = rec["nombre"].strip()
    if not name:
        raise _RowError("falta el nombre de la organización")
    raw_quota = rec["cupo_licencias"].strip()
    quota: int | None = None
    if raw_quota:
        try:
            quota = int(float(raw_quota))
        except ValueError as exc:
            raise _RowError(f"cupo_licencias inválido '{raw_quota}'") from exc
        if quota < 0:
            raise _RowError("cupo_licencias no puede ser negativo")

    slug_raw = rec["slug"].strip().lower()
    existing = db.scalar(
        select(Organization).where(
            Organization.company_id == company_id,
            (func.lower(Organization.slug) == (slug_raw or _slugify(name)))
            | (func.lower(Organization.name) == name.lower()),
        )
    )
    if existing is not None:
        if quota is None or quota == existing.license_quota:
            return "sin_cambios"
        company_service.set_org_license_quota(
            db, company_id=company_id, org_id=existing.id, license_quota=quota
        )
        return "actualizada"

    slug = slug_raw or _slugify(name)
    if db.scalar(select(func.count()).select_from(Organization).where(Organization.slug == slug)):
        if slug_raw:
            raise _RowError(f"el slug '{slug}' ya está en uso")
        slug = f"{slug}-{uuid4().hex[:4]}"  # el slug es único global: se desambigua
    company_service.create_org_in_company(
        db, company_id=company_id,
        data=CreateCompanyOrgRequest(name=name, slug=slug, license_quota=quota or 0),
    )
    return "creada"


# ─────────────────────────── Miembros ───────────────────────────


def _index_file_members(
    records: list[dict[str, str]],
    by_slug: dict[str, Organization],
    by_name: dict[str, Organization],
) -> dict[str, tuple[UUID, UserRole]]:
    """email → (org, rol) de las filas del archivo que se pueden interpretar. Sirve
    para validar que un ``manager_email`` existe en el mismo archivo aunque esa fila
    venga después."""
    index: dict[str, tuple[UUID, UserRole]] = {}
    for rec in records:
        try:
            org = _resolve_org(rec["organizacion"], by_slug, by_name)
            role = _resolve_role(rec["rol"])
        except _RowError:
            continue
        index[rec["email"].strip().lower()] = (org.id, role)
    return index


def _process_member(
    db: Session, *, company_id: UUID, rec: dict[str, str], email: str,
    by_slug: dict[str, Organization], by_name: dict[str, Organization],
    file_index: dict[str, tuple[UUID, UserRole]], pool_total: int, pool_used: int,
) -> tuple[str, bool, User]:
    """Valida + aplica una fila (sin enlazar manager: eso es la segunda pasada).
    Devuelve ``(estado, consumió_asiento_del_pool_proyectado, user)``."""
    if not _EMAIL_RE.match(email):
        raise _RowError("email inválido")

    org = _resolve_org(rec["organizacion"], by_slug, by_name)
    role = _resolve_role(rec["rol"])
    full_name = rec["nombre_completo"].strip()
    manager_email = rec["manager_email"].strip().lower()
    if manager_email:
        _check_manager(db, org.id, email, manager_email, file_index)

    def reserve() -> None:
        """Chequea el pool de la Empresa contra la proyección; levanta si excede
        (CE-06: sin cap por-org)."""
        if pool_used >= pool_total:
            raise _RowError("se excede el pool de licencias de la empresa")

    existing = db.scalar(
        select(User).where(User.company_id == company_id, func.lower(User.email) == email)
    )
    if existing is not None:
        prev_org_id = existing.org_id
        estado, consumed = _update_existing(db, existing, org, role, full_name, reserve)
        if existing.org_id != prev_org_id and not existing.is_invited:
            apply_org_modules(db, existing)  # módulos de la org de destino
        user = existing
    else:
        reserve()
        user = identity_service.get_or_create_invited_user(
            db, org=org, email=rec["email"].strip(), role=role, full_name=full_name or None
        )
        estado, consumed = "creado", True
    if rec.get("puesto", "").strip():
        user.job_title = rec["puesto"].strip()
    if rec.get("departamento", "").strip():
        user.department = rec["departamento"].strip()
    return estado, consumed, user


def _update_existing(
    db: Session, user: User, org: Organization, role: UserRole, full_name: str,
    reserve: Callable[[], None],
) -> tuple[str, bool]:
    """Aplica los cambios de la fila a un user existente. Reactiva si estaba
    desactivado (consume asiento del pool). Devuelve ``("actualizado", consumió?)``."""
    if full_name:
        user.full_name = full_name
    if user.role != role:
        user.role = role
    if org.id != user.org_id:
        if user.is_invited:
            # El enlace ya enviado apunta a la org vieja: se revoca y se reenvía luego.
            _revoke_pending(db, user)
        user.org_id = org.id
        user.company_id = org.company_id
        user.manager_id = None  # el manager viejo era de otra org
    consumed = False
    # Un invitado (pre-provisioning) no se "reactiva": se activa al aceptar.
    if not user.is_active and not user.is_invited:
        reserve()
        user.is_active = True
        consumed = True
    return "actualizado", consumed


def _revoke_pending(db: Session, user: User) -> None:
    now = datetime.now(UTC)
    for inv in db.scalars(
        select(Invitation).where(
            Invitation.org_id == user.org_id,
            func.lower(Invitation.email) == user.email.lower(),
            Invitation.accepted_at.is_(None),
            Invitation.revoked_at.is_(None),
        )
    ).all():
        inv.revoked_at = now


def _check_manager(
    db: Session, org_id: UUID, own_email: str, manager_email: str,
    file_index: dict[str, tuple[UUID, UserRole]],
) -> None:
    """El manager debe ser manager de la MISMA org: ya existente o una fila del mismo
    archivo (que se crea en la primera pasada)."""
    if manager_email == own_email:
        raise _RowError("manager_email no puede ser la misma persona")
    existing = identity_service.find_user_by_email(db, org_id, manager_email)
    if existing is not None:
        if existing.role != UserRole.manager:
            raise _RowError("manager_email no es manager de la organización")
        return
    in_file = file_index.get(manager_email)
    if in_file is not None and in_file[0] == org_id:
        if in_file[1] != UserRole.manager:
            raise _RowError("manager_email no es manager de la organización")
        return
    raise _RowError("manager_email no existe en la organización")


def _link_manager(db: Session, *, user_id: UUID, manager_email: str) -> None:
    user = db.get(User, user_id)
    if user is None:
        raise _RowError("la persona ya no existe")
    manager = identity_service.find_user_by_email(db, user.org_id, manager_email)
    if manager is None:
        raise _RowError("manager_email no existe en la organización")
    if manager.role != UserRole.manager:
        raise _RowError("manager_email no es manager de la organización")
    if manager.id == user.id:
        raise _RowError("manager_email no puede ser la misma persona")
    user.manager_id = manager.id


def _resolve_org(
    raw: str, by_slug: dict[str, Organization], by_name: dict[str, Organization]
) -> Organization:
    key = raw.strip().lower()
    if not key:
        raise _RowError("falta la organización")
    org = by_slug.get(key) or by_name.get(key)
    if org is None:
        raise _RowError(f"la organización '{raw}' no pertenece a la empresa")
    return org


def _resolve_role(raw: str) -> UserRole:
    role = _ROLE_ALIASES.get(raw.strip().lower())
    if role is None:
        raise _RowError(f"rol inválido '{raw}' (usar manager, collaborator o admin)")
    return role


# ─────────────────────────── Módulos por organización ───────────────────────────


def _parse_due_date(raw: str) -> datetime | None:
    raw = raw.strip()
    if not raw:
        return None
    try:
        day = date.fromisoformat(raw[:10])
    except ValueError as exc:
        raise _RowError(f"fecha_limite inválida '{raw}' (usar AAAA-MM-DD)") from exc
    return datetime(day.year, day.month, day.day, 23, 59, tzinfo=UTC)


def _process_module(
    db: Session, *, company_id: UUID, actor: User, rec: dict[str, str],
    by_slug: dict[str, Organization], by_name: dict[str, Organization],
) -> tuple[str, list[User]]:
    org = _resolve_org(rec["organizacion"], by_slug, by_name)
    slug = rec["modulo"].strip()
    if not slug:
        raise _RowError("falta el módulo")
    unit = db.scalar(select(LearningUnit).where(func.lower(LearningUnit.slug) == slug.lower()))
    if unit is None:
        raise _RowError(f"el módulo '{slug}' no existe")
    problem = org_assignment_error(db, company_id, [unit])
    if problem is not None:
        raise _RowError(problem)
    due = _parse_due_date(rec["fecha_limite"])

    new_rules = upsert_org_modules(
        db, org_id=org.id, unit_ids=[unit.id], assigned_by=actor.id, due_date=due, note=None
    )
    newly = assign_units_to_active_members(
        db, org_id=org.id, unit_ids=[unit.id], assigned_by=actor.id, due_date=due, note=None
    )
    return ("asignado" if new_rules or newly else "sin_cambios"), newly


# ─────────────────────────── Advertencias ───────────────────────────


def _license_warnings(db: Session, company_id: UUID, licenses_total: int) -> list[str]:
    """Avisos (no bloquean) sobre el uso proyectado de licencias: los invitados no
    consumen cupo hasta aceptar, así que se puede invitar a más gente que licencias."""
    warnings: list[str] = []
    invited = int(
        db.scalar(
            select(func.count()).select_from(User).where(
                User.company_id == company_id, User.is_invited.is_(True)
            )
        )
        or 0
    )
    active = identity_service.company_active_users(db, company_id)
    if active + invited > licenses_total:
        warnings.append(
            f"Entre activos ({active}) e invitados ({invited}) superan las licencias de la "
            f"empresa ({licenses_total}): quienes acepten al final podrían quedar sin cupo."
        )
    rows = db.execute(
        select(Organization.name, Organization.license_quota, func.count(User.id))
        .join(User, User.org_id == Organization.id)
        .where(
            Organization.company_id == company_id,
            Organization.license_quota > 0,
            (User.is_active.is_(True)) | (User.is_invited.is_(True)),
        )
        .group_by(Organization.id)
    ).all()
    for name, quota, count in rows:
        if count > quota:
            warnings.append(f"La organización '{name}' tiene {count} personas para un cupo de {quota}.")
    return warnings


# ─────────────────────────── Template ───────────────────────────


def build_template_xlsx() -> bytes:
    """Genera el `.xlsx` de plantilla: las tres hojas con ejemplos."""
    wb = openpyxl.Workbook()
    ws_orgs = wb.active
    ws_orgs.title = SHEET_ORGS
    ws_orgs.append(ORG_HEADERS)
    ws_orgs.append(["Ventas", "ventas", 20])
    ws_members = wb.create_sheet(SHEET_MEMBERS)
    ws_members.append(TEMPLATE_HEADERS)
    ws_members.append(["ventas", "jefa@empresa.com", "Nombre Apellido", "manager", "", "Gerente", "Comercial"])
    ws_members.append(["ventas", "persona@empresa.com", "Nombre Apellido", "collaborator", "jefa@empresa.com", "", ""])
    ws_modules = wb.create_sheet(SHEET_MODULES)
    ws_modules.append(MODULE_HEADERS)
    ws_modules.append(["ventas", "slug-del-modulo", "2026-12-31"])
    wb.active = wb.worksheets.index(ws_members)  # abre en Miembros
    buffer = BytesIO()
    wb.save(buffer)
    return buffer.getvalue()
