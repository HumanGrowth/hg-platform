"""LC-08: scripts/lc_migrate_company.py — dry-run por defecto, nunca toca usuarios."""
from __future__ import annotations

import importlib.util
import sys
from datetime import UTC, datetime, timedelta
from io import StringIO
from pathlib import Path
from types import SimpleNamespace

import pytest
from sqlalchemy import select, update

from hg.modules.company.models import CompanyLifecycleEvent
from hg.modules.identity.models import Company, User, UserRole

_SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "lc_migrate_company.py"
_spec = importlib.util.spec_from_file_location("lc_migrate_company", _SCRIPT)
assert _spec and _spec.loader
cli = importlib.util.module_from_spec(_spec)
sys.modules["lc_migrate_company"] = cli  # @dataclass resuelve el módulo por nombre
_spec.loader.exec_module(cli)


def _run(*argv: str) -> tuple[int, str]:
    out = StringIO()
    code = cli.main(list(argv), out=out)
    return code, out.getvalue()


@pytest.fixture
def co(factory):
    """Empresa activa con 2 activos, 2 inactivos (cierre a mano) y 1 invitado."""
    company = factory.make_company(status="active")
    org = factory.make_org(company=company, name="Ventas")
    users = SimpleNamespace(
        admin=factory.make_user(org=org, role=UserRole.company_admin),
        active=factory.make_user(org=org),
        off1=factory.make_user(org=org, email="inactivo1@hgtest.test", is_active=False,
                               last_login_at=datetime(2026, 9, 1, tzinfo=UTC)),
        off2=factory.make_user(org=org, email="inactivo2@hgtest.test", is_active=False),
        invited=factory.make_user(org=org, is_invited=True, is_active=False),
    )  # fmt: skip
    return SimpleNamespace(company=company, org=org, **vars(users))


def _fresh(factory, company: Company) -> Company:
    factory.session.expire_all()
    return factory.session.get(Company, company.id)


def _events(factory, company: Company) -> list[CompanyLifecycleEvent]:
    factory.session.expire_all()
    return list(
        factory.session.scalars(
            select(CompanyLifecycleEvent).where(CompanyLifecycleEvent.company_id == company.id)
        )
    )


def test_default_is_dry_run_read_only_and_announces_the_target_db(factory, co) -> None:
    code, out = _run("--slug", co.company.slug)
    assert code == 0
    assert "dry-run (solo lectura)" in out
    assert "Base de datos: localhost:5432/hg_dev" in out
    assert "hg:hg" not in out and "@" not in out.split("\n")[0]  # nunca credenciales
    assert "[dry-run] Solo lectura" in out
    assert _fresh(factory, co.company).status == "active"
    assert _events(factory, co.company) == []


def test_report_counts_users_and_lists_inactive_for_a_human_to_decide(factory, co) -> None:
    code, out = _run("--slug", co.company.slug)
    assert code == 0
    assert "activos:    2" in out
    assert "inactivos:  2" in out
    assert "invitados (sin aceptar): 1" in out
    assert "inactivo1@hgtest.test" in out and "inactivo2@hgtest.test" in out
    assert "2026-09-01" in out  # último login visible para decidir
    assert "NO reactiva" in out or "no se sabe cuáles" in out


def test_flags_a_company_closed_by_hand(factory, co) -> None:
    factory.session.execute(
        update(User).where(User.company_id == co.company.id, User.is_invited.is_(False)).values(is_active=False)
    )
    factory.session.commit()
    _, out = _run("--slug", co.company.slug)
    assert "cerrada a mano" in out


def test_preview_of_a_transition_writes_nothing(factory, co) -> None:
    code, out = _run("--slug", co.company.slug, "--to", "grace")
    assert code == 0
    assert "[dry-run] vista previa: active → grace" in out
    assert "Nada se escribió" in out
    assert "la gracia termina" in out
    assert _fresh(factory, co.company).status == "active"
    assert _events(factory, co.company) == []


def test_apply_grace_changes_status_records_event_and_never_touches_users(factory, co) -> None:
    before = {u.id: (u.is_active, u.is_invited) for u in factory.session.scalars(
        select(User).where(User.company_id == co.company.id))}  # fmt: skip
    su = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)

    code, out = _run(
        "--slug", co.company.slug, "--to", "grace", "--apply",
        "--reason", "Cierre de piloto", "--actor-email", su.email,
    )  # fmt: skip
    assert code == 0, out
    assert "modo: APPLY" in out and "APLICADO: active → grace" in out

    c = _fresh(factory, co.company)
    assert c.status == "grace"
    assert c.grace_ends_at is not None
    assert c.grace_ends_at > datetime.now(UTC) + timedelta(days=c.grace_days - 1)
    (ev,) = _events(factory, co.company)
    assert (ev.from_status, ev.to_status, ev.actor_user_id) == ("active", "grace", su.id)
    assert ev.reason == "script:lc_migrate_company: Cierre de piloto"

    after = {u.id: (u.is_active, u.is_invited) for u in factory.session.scalars(
        select(User).where(User.company_id == co.company.id))}  # fmt: skip
    assert after == before  # ni un solo usuario reactivado ni desactivado


def test_apply_suspended_needs_reason_and_confirm_slug(factory, co) -> None:
    slug = co.company.slug
    code, out = _run("--slug", slug, "--to", "suspended", "--apply")
    assert code == 3 and "--reason es obligatorio" in out
    code, out = _run("--slug", slug, "--to", "suspended", "--apply", "--reason", "x")
    assert code == 3 and "--confirm-slug" in out
    code, out = _run("--slug", slug, "--to", "suspended", "--apply", "--reason", "x", "--confirm-slug", "otro")
    assert code == 3
    assert _fresh(factory, co.company).status == "active"

    code, out = _run("--slug", slug, "--to", "suspended", "--apply", "--reason", "Fin de contrato", "--confirm-slug", slug)
    assert code == 0, out
    assert _fresh(factory, co.company).status == "suspended"
    # los inactivos siguen inactivos y los activos siguen activos
    factory.session.expire_all()
    assert factory.session.get(User, co.off1.id).is_active is False
    assert factory.session.get(User, co.active.id).is_active is True


def test_invalid_transition_is_rejected_and_writes_nothing(factory, co) -> None:
    factory.session.execute(update(Company).where(Company.id == co.company.id).values(status="suspended"))
    factory.session.commit()
    code, out = _run("--slug", co.company.slug, "--to", "grace", "--apply")
    assert code == 4 and "Transición rechazada" in out
    assert _fresh(factory, co.company).status == "suspended"
    assert _events(factory, co.company) == []


def test_unknown_slug_and_unknown_actor(factory, co) -> None:
    assert _run("--slug", "no-existe-xyz")[0] == 2
    code, out = _run("--slug", co.company.slug, "--to", "grace", "--apply", "--actor-email", "nadie@hgtest.test")
    assert code == 3 and "no existe" in out
    assert _fresh(factory, co.company).status == "active"


def test_inactive_csv_export(factory, co, tmp_path) -> None:
    dest = tmp_path / "inactivos.csv"
    code, _ = _run("--slug", co.company.slug, "--inactive-csv", str(dest))
    assert code == 0
    rows = dest.read_text(encoding="utf-8").strip().splitlines()
    assert rows[0].startswith("email,nombre,rol")
    assert sorted(r.split(",")[0] for r in rows[1:]) == ["inactivo1@hgtest.test", "inactivo2@hgtest.test"]


def test_script_has_no_code_path_that_reactivates_users() -> None:
    src = _SCRIPT.read_text(encoding="utf-8")
    assert "is_active=True" not in src and "is_active = True" not in src
    assert "update(User" not in src and "delete(" not in src


def test_only_closing_targets_are_allowed() -> None:
    with pytest.raises(SystemExit):
        cli.build_parser().parse_args(["--slug", "x", "--to", "active"])
    with pytest.raises(SystemExit):
        cli.build_parser().parse_args(["--slug", "x", "--to", "terminated"])
