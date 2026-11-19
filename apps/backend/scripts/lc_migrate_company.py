"""LC-08 · Inspecciona y (opcionalmente) cambia el estado de ciclo de vida de UNA Empresa.

Pensado para migrar al modelo nuevo (ADR-0016) una empresa que se cerró "a mano"
desactivando usuarios (caso CESA) y, en general, para cerrar pilotos desde consola.

SEGURO POR DEFECTO:
  - **Dry-run por defecto**: sin ``--apply`` solo lee. No escribe nada.
  - Con ``--apply`` usa ``transition_company`` (único escritor de ``companies.status``):
    valida la matriz de transiciones, exige motivo y deja el evento de auditoría.
  - **Nunca reactiva ni modifica usuarios.** No existe ningún camino de código que lo haga.
    Si la empresa se cerró desactivando usuarios, el script solo LISTA los inactivos para que
    una persona decida a cuáles restaurar: no se puede saber cuáles desactivó el cierre y
    cuáles ya estaban inactivos antes.
  - Imprime el host/base de datos al que se conecta ANTES de hacer nada.

Uso (desde ``apps/backend``; la conexión sale de ``DATABASE_URL``):

  # 1) Ver estado actual (dry-run, no escribe):
  uv run python scripts/lc_migrate_company.py --slug <slug>

  # 2) Vista previa de una transición (dry-run, no escribe):
  uv run python scripts/lc_migrate_company.py --slug <slug> --to grace

  # 3) Aplicar (escribe):
  uv run python scripts/lc_migrate_company.py --slug <slug> --to grace --apply \
      --reason "Cierre de piloto" --actor-email <superadmin@...>
  uv run python scripts/lc_migrate_company.py --slug <slug> --to suspended --apply \
      --reason "Fin de contrato" --confirm-slug <slug>

  # Exportar los usuarios inactivos para decidir cuáles restaurar:
  uv run python scripts/lc_migrate_company.py --slug <slug> --inactive-csv inactivos.csv

Códigos de salida: 0 ok · 2 empresa no encontrada · 3 argumentos inválidos · 4 transición rechazada ·
5 la base no tiene la migración LC-01 (aplicarla antes: `alembic upgrade head`).
"""
from __future__ import annotations

import argparse
import csv
import sys
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import TextIO

from fastapi import HTTPException
from sqlalchemy import func, select, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from hg.config import get_settings
from hg.db import SessionLocal
from hg.modules.company.lifecycle import REASON_REQUIRED, STATUSES, transition_company
from hg.modules.identity.models import Company, Organization, User

# Solo estados a los que este script puede llevar a una empresa (cierre de piloto).
TARGETS = ("grace", "suspended")
REASON_PREFIX = "script:lc_migrate_company"

EXIT_OK, EXIT_NOT_FOUND, EXIT_BAD_ARGS, EXIT_REJECTED, EXIT_NO_MIGRATION = 0, 2, 3, 4, 5


@dataclass
class InactiveUser:
    email: str
    full_name: str
    role: str
    org: str
    last_login_at: datetime | None
    last_active_at: datetime | None
    created_at: datetime | None


@dataclass
class CompanyReport:
    company: Company
    orgs: int
    active: int
    inactive: int
    invited: int
    by_role_active: dict[str, int] = field(default_factory=dict)
    inactive_users: list[InactiveUser] = field(default_factory=list)

    @property
    def looks_closed_by_hand(self) -> bool:
        """Heurística (solo informativa): hay usuarios pero ninguno activo, o `is_active=false`."""
        total = self.active + self.inactive
        return (total > 0 and self.active == 0) or not self.company.is_active


def inspect_company(db: Session, slug: str) -> CompanyReport | None:
    company = db.scalar(select(Company).where(Company.slug == slug))
    if company is None:
        return None
    orgs = int(
        db.scalar(select(func.count()).select_from(Organization).where(Organization.company_id == company.id))
        or 0
    )
    users = db.execute(
        select(User, Organization.name)
        .join(Organization, Organization.id == User.org_id)
        .where(User.company_id == company.id)
        .order_by(Organization.name, User.email)
    ).all()
    by_role: Counter[str] = Counter()
    inactive: list[InactiveUser] = []
    active = invited = 0
    for u, org_name in users:
        if u.is_invited:
            invited += 1  # invitado que aún no aceptó: no es "inactivo", no tiene cuenta usable
        elif u.is_active:
            active += 1
            by_role[u.role.value] += 1
        else:
            inactive.append(
                InactiveUser(
                    email=u.email, full_name=u.full_name, role=u.role.value, org=org_name,
                    last_login_at=u.last_login_at, last_active_at=u.last_active_at, created_at=u.created_at,
                )
            )
    return CompanyReport(
        company=company, orgs=orgs, active=active, inactive=len(inactive), invited=invited,
        by_role_active=dict(by_role), inactive_users=inactive,
    )


def _fmt(dt: datetime | None) -> str:
    return dt.strftime("%Y-%m-%d") if dt else "—"


def render(report: CompanyReport, out: TextIO) -> None:
    c = report.company
    p = lambda s="": print(s, file=out)  # noqa: E731
    p(f"Empresa: {c.name}  (slug: {c.slug})")
    p(f"  estado (companies.status): {c.status}   desde {_fmt(c.status_changed_at)}"
      + (f"   motivo: {c.status_reason}" if c.status_reason else ""))
    if c.grace_ends_at:
        p(f"  fin de gracia: {c.grace_ends_at.isoformat()}  (grace_days={c.grace_days})")
    p(f"  billing_status: {c.billing_status}   contrato: {c.contract_start or '—'} → {c.contract_end or '—'}")
    p(f"  companies.is_active (DEPRECADO, nadie lo valida): {c.is_active}")
    p(f"  licencias: pool {c.licenses_total} · activos {report.active}")
    p(f"  organizaciones: {report.orgs}")
    p()
    p("Usuarios")
    p(f"  activos:    {report.active}   {report.by_role_active or ''}")
    p(f"  inactivos:  {report.inactive}")
    p(f"  invitados (sin aceptar): {report.invited}")
    if report.looks_closed_by_hand:
        p()
        p("  ⚠ Parece una empresa cerrada a mano (usuarios inactivos / is_active=false), con estado "
          f"'{c.status}'.")
        p("    Este script NO reactiva a nadie. Revisá la lista de inactivos y decidí a quiénes restaurar.")
    if report.inactive_users:
        p()
        p("Inactivos (no se sabe cuáles desactivó el cierre y cuáles ya estaban inactivos):")
        p(f"  {'email':40} {'rol':14} {'org':22} {'último login':12} {'última activ.':12}")
        for u in report.inactive_users:
            p(f"  {u.email[:40]:40} {u.role:14} {u.org[:22]:22} {_fmt(u.last_login_at):12} {_fmt(u.last_active_at):12}")


def write_inactive_csv(report: CompanyReport, path: Path) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["email", "nombre", "rol", "organizacion", "ultimo_login", "ultima_actividad", "creado"])
        for u in report.inactive_users:
            w.writerow([u.email, u.full_name, u.role, u.org, _fmt(u.last_login_at), _fmt(u.last_active_at), _fmt(u.created_at)])


def describe_target(url: str) -> str:
    """Host y base de datos de la conexión (sin usuario ni contraseña)."""
    u = make_url(url)
    return f"{u.host or 'local'}:{u.port or ''}/{u.database}"


def schema_ready(db: Session) -> bool:
    """¿La base ya tiene la migración LC-01 (`companies.status`)? Sin ella ni siquiera se puede
    leer el modelo `Company`: se avisa con un mensaje claro en vez de un traceback."""
    return bool(
        db.scalar(
            text(
                "SELECT 1 FROM information_schema.columns "
                "WHERE table_schema = current_schema() AND table_name = 'companies' AND column_name = 'status'"
            )
        )
    )


def run(db: Session, args: argparse.Namespace, out: TextIO) -> int:
    if not schema_ready(db):
        print(
            "Esta base de datos NO tiene la migración LC-01 (falta companies.status).\n"
            "No se leyó ni se escribió nada. Aplicá primero la migración (`alembic upgrade head`, por el\n"
            "flujo normal de despliegue) y volvé a correr este script.",
            file=out,
        )
        return EXIT_NO_MIGRATION
    report = inspect_company(db, args.slug)
    if report is None:
        print(f"No existe una empresa con slug '{args.slug}'.", file=out)
        return EXIT_NOT_FOUND

    render(report, out)
    if args.inactive_csv:
        write_inactive_csv(report, Path(args.inactive_csv))
        print(f"\nInactivos exportados a {args.inactive_csv}", file=out)

    if not args.to:
        print("\n[dry-run] Solo lectura. Para ver una transición: --to grace | suspended.", file=out)
        return EXIT_OK

    actor = None
    if args.actor_email:
        actor = db.scalar(select(User).where(func.lower(User.email) == args.actor_email.lower()))
        if actor is None:
            print(f"actor-email '{args.actor_email}' no existe.", file=out)
            return EXIT_BAD_ARGS
    reason = f"{REASON_PREFIX}: {args.reason}".strip(": ") if args.reason else None
    if args.apply and args.to in REASON_REQUIRED and not args.reason:
        print(f"--reason es obligatorio para pasar a {args.to}.", file=out)
        return EXIT_BAD_ARGS
    if args.apply and args.to in REASON_REQUIRED and args.confirm_slug != args.slug:
        print(f"Para pasar a {args.to} repetí --confirm-slug {args.slug}.", file=out)
        return EXIT_BAD_ARGS

    try:
        preview = transition_company(
            db, company_id=report.company.id, to_status=args.to, actor=actor, reason=reason,
            dry_run=not args.apply,
        )
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, dict) else {"message": str(exc.detail)}
        print(f"\nTransición rechazada ({exc.status_code}): {detail.get('message')}", file=out)
        return EXIT_REJECTED

    print(f"\n{'APLICADO' if args.apply else '[dry-run] vista previa'}: "
          f"{preview.from_status} → {preview.to_status}", file=out)
    print(f"  usuarios activos (NO se modifican): {preview.active_users_total} {preview.active_users_by_role}", file=out)
    print(f"  invitaciones pendientes: {preview.pending_invitations} · administradores a avisar: {preview.admins}", file=out)
    if preview.grace_ends_at:
        print(f"  la gracia termina: {preview.grace_ends_at.isoformat()}", file=out)
    if not args.apply:
        print("  Nada se escribió. Para aplicar agregá --apply (y --reason; y --confirm-slug si es suspended).", file=out)
    return EXIT_OK


def build_parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--slug", required=True, help="slug de la empresa")
    ap.add_argument("--to", choices=TARGETS, help="estado destino (sin --apply es solo vista previa)")
    ap.add_argument("--apply", action="store_true", help="ESCRIBE el cambio (por defecto es dry-run)")
    ap.add_argument("--reason", help="motivo (obligatorio para suspended)")
    ap.add_argument("--confirm-slug", help="repetir el slug para confirmar suspended")
    ap.add_argument("--actor-email", help="superadmin que figura en el evento de auditoría")
    ap.add_argument("--inactive-csv", help="exporta los usuarios inactivos a este CSV")
    return ap


def main(argv: list[str] | None = None, out: TextIO | None = None) -> int:
    out = out or sys.stdout
    args = build_parser().parse_args(argv)
    assert set(TARGETS) <= set(STATUSES)
    print(f"Base de datos: {describe_target(get_settings().database_url)}"
          f"   modo: {'APPLY (escribe)' if args.apply else 'dry-run (solo lectura)'}\n", file=out)
    db = SessionLocal()
    try:
        db.begin()
        # Mismo rol que usa la app para operar sobre tablas de empresa (ver get_db_as_superadmin).
        db.execute(text("SET LOCAL ROLE hg_superadmin"))
        code = run(db, args, out)
        if code == EXIT_OK and args.apply:
            db.commit()
        else:
            db.rollback()  # dry-run o error: nunca queda nada escrito
        return code
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
