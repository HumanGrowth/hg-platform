"""Dashboard RRHH v2: ventana unificada, completion sobre asignado, deltas,
licencias y /admin/org/insights (cumplimiento, seguimiento, consentimiento…)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from hg.modules.identity.models import Company, User, UserRole
from hg.modules.learning_units.models import ModuleAssignment


def _admin(factory, mw):
    """Admin RRHH; además retrocede created_at de la org (simula una org con
    historia, si no el período anterior no tiene base de comparación)."""
    admin = factory.make_user(org=mw.org, role=UserRole.admin, full_name="Admin RRHH")
    s = factory.session
    s.execute(
        update(User)
        .where(User.org_id == mw.org.id)
        .values(created_at=datetime.now(UTC) - timedelta(days=120))
    )
    s.commit()
    return admin


def test_active_and_inactive_share_window(client, manager_with_reports, factory, auth_headers) -> None:
    """r2 (25d sin entrar) ya no es 'activo' por 30d e 'inactivo' por 21d a la vez."""
    mw = manager_with_reports
    admin = _admin(factory, mw)
    body = client.get("/api/v1/admin/org/metrics", headers=auth_headers(admin)).json()
    assert body["active_licenses"] + body["inactive_users_count"] == body["total_licenses"]
    assert body["active_licenses"] == 1  # solo r1
    # r2 (25d) cae en el período anterior (21-42d atrás) → delta calculable.
    assert body["previous"] is not None
    assert body["previous"]["active_users"] >= 1
    # Necesitan seguimiento == inactivos.
    inact = body["inactivity"]
    assert inact["d22_30"] + inact["gt_30"] + inact["never_active"] == body["inactive_users_count"]


def test_assigned_completion_and_licenses(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = _admin(factory, mw)
    s = factory.session
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r1.id, learning_unit_id=mw.units[0].id))
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r2.id, learning_unit_id=mw.units[1].id))
    s.commit()
    body = client.get("/api/v1/admin/org/metrics", headers=auth_headers(admin)).json()
    assert body["assigned_total"] == 2
    assert body["assigned_completed"] == 1  # r1 completó units[0]
    assert body["assigned_completion_rate"] == 0.5
    lic = body["licenses"]
    assert lic["scope"] == "company"
    assert lic["total"] == 50 and lic["used"] == 5  # pool de la Company de test


def test_insights_requires_admin(client, manager_with_reports, auth_headers) -> None:
    res = client.get("/api/v1/admin/org/insights", headers=auth_headers(manager_with_reports.r1))
    assert res.status_code == 403


def test_insights_accounts_progress(client, manager_with_reports, factory, auth_headers) -> None:
    """Todas las cuentas del alcance, con último login y avance sobre lo asignado."""
    mw = manager_with_reports
    admin = _admin(factory, mw)
    s = factory.session
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r1.id, learning_unit_id=mw.units[0].id))  # cumplida
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r1.id, learning_unit_id=mw.units[1].id))  # cumplida
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r2.id, learning_unit_id=mw.units[2].id))  # pendiente
    s.execute(update(User).where(User.id == mw.r1.id).values(last_login_at=datetime.now(UTC)))
    s.commit()
    accounts = client.get("/api/v1/admin/org/insights", headers=auth_headers(admin)).json()["accounts"]
    assert len(accounts) == 3  # solo colaboradores: r1, r2, r3 (sin manager ni admin)
    by_name = {a["full_name"]: a for a in accounts}
    r1 = by_name["Active Report"]
    # modules_completed es el total (como el perfil: r1 completó 5); lo asignado va aparte.
    assert (r1["modules_completed"], r1["modules_assigned"], r1["modules_assigned_completed"]) == (5, 2, 2)
    assert r1["last_login_at"] is not None and r1["is_inactive"] is False
    r2 = by_name["Inactive Report"]
    assert (r2["modules_completed"], r2["modules_assigned"], r2["modules_assigned_completed"]) == (0, 1, 0)
    assert r2["is_inactive"] is True and r2["manager_name"] == "Manager One"
    assert by_name["Never Active"]["last_login_at"] is None
    # Orden: quienes nunca ingresaron primero; r1 (login más reciente) al final.
    assert accounts[-1]["full_name"] == "Active Report"
    assert "follow_up" not in client.get("/api/v1/admin/org/insights", headers=auth_headers(admin)).json()


def test_insights_assignments_assessment(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = _admin(factory, mw)
    s = factory.session
    now = datetime.now(UTC)
    s.add(ModuleAssignment(  # vencida, r2 sin completar units[2]
        org_id=mw.org.id, user_id=mw.r2.id, learning_unit_id=mw.units[2].id,
        due_date=now - timedelta(days=3),
    ))
    s.add(ModuleAssignment(  # cumplida (r1 completó units[0])
        org_id=mw.org.id, user_id=mw.r1.id, learning_unit_id=mw.units[0].id,
    ))
    s.commit()
    body = client.get("/api/v1/admin/org/insights", headers=auth_headers(admin)).json()

    a = body["assignments"]
    assert (a["total"], a["completed"], a["overdue"], a["users_with_overdue"]) == (2, 1, 1, 1)
    # Desglose por organización (una sola org en este escenario).
    assert len(a["by_org"]) == 1
    o = a["by_org"][0]
    assert (o["total"], o["completed"], o["overdue"], o["due_soon"], o["open"]) == (2, 1, 1, 0, 0)

    # Assessment: nadie tiene resultados → nada que mostrar, sin romper.
    asm = body["assessment"]
    assert asm["total_users"] == 3 and asm["with_results"] == 0 and asm["dimensions"] == []
    assert asm["min_group"] == 5

    # Los widgets de consentimiento y retención ya no existen.
    assert "consent" not in body and "retention" not in body


def test_org_widgets_adoption_pct_and_per_user(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = _admin(factory, mw)
    body = client.get("/api/v1/admin/org/widgets", headers=auth_headers(admin)).json()
    last = body["adoption_curve"][-1]
    assert last["total_users"] >= 3 and last["active_users"] >= 1
    assert body["monthly_watch"][-1]["per_active_user"] >= 0


def test_by_org_reports_assigned_vs_completed(client, manager_with_reports, factory, auth_headers) -> None:
    """Comparativa por org: módulos asignados vs completados (no 'terminados ÷ iniciados')."""
    mw = manager_with_reports
    s = factory.session
    other = factory.make_org(name="Otra Org", company=s.get(Company, mw.org.company_id))
    u_other = factory.make_user(org=other, full_name="Otro")
    admin = factory.make_user(org=mw.org, role=UserRole.admin, full_name="Admin RRHH")
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r1.id, learning_unit_id=mw.units[0].id))  # cumplida
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r2.id, learning_unit_id=mw.units[1].id))  # pendiente
    s.commit()
    body = client.get("/api/v1/admin/org/metrics", headers=auth_headers(admin)).json()
    rows = {o["org_name"]: o for o in body["by_org"]}
    assert "completion_rate" not in rows["Test Org"]
    assert (rows["Test Org"]["assigned_total"], rows["Test Org"]["assigned_completed"]) == (2, 1)
    assert rows["Test Org"]["assigned_completion_rate"] == 0.5
    assert rows["Otra Org"]["assigned_total"] == 0
    assert rows["Otra Org"]["assigned_completion_rate"] is None
    assert u_other.id  # la org sin asignaciones también aparece


def test_assignment_compliance_by_org_chips(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    s = factory.session
    other = factory.make_org(name="Otra Org", company=s.get(Company, mw.org.company_id))
    u_other = factory.make_user(org=other, full_name="Otro")
    admin = _admin(factory, mw)
    s.add(ModuleAssignment(org_id=mw.org.id, user_id=mw.r1.id, learning_unit_id=mw.units[0].id))  # cumplida
    s.add(ModuleAssignment(
        org_id=other.id, user_id=u_other.id, learning_unit_id=mw.units[1].id,
        due_date=datetime.now(UTC) - timedelta(days=2),
    ))  # vencida en la otra org
    s.commit()
    a = client.get("/api/v1/admin/org/insights", headers=auth_headers(admin)).json()["assignments"]
    by_name = {o["org_name"]: o for o in a["by_org"]}
    assert set(by_name) == {"Test Org", "Otra Org"}
    assert (by_name["Test Org"]["total"], by_name["Test Org"]["completed"]) == (1, 1)
    assert (by_name["Otra Org"]["total"], by_name["Otra Org"]["overdue"]) == (1, 1)
    assert a["total"] == 2 and a["overdue"] == 1


def test_stats_exclude_managers_and_admins(client, manager_with_reports, factory, auth_headers) -> None:
    """Las estadísticas de avance cuentan solo colaboradores."""
    mw = manager_with_reports
    admin = _admin(factory, mw)
    h = auth_headers(admin)
    metrics = client.get("/api/v1/admin/org/metrics", headers=h).json()
    assert metrics["total_licenses"] == 3
    accounts = client.get("/api/v1/admin/org/insights", headers=h).json()["accounts"]
    names = {a["full_name"] for a in accounts}
    assert "Manager One" not in names and "Admin RRHH" not in names
    # El nombre del manager sigue resolviéndose aunque no esté en la lista.
    assert {a["manager_name"] for a in accounts} == {"Manager One"}
    # El export CSV conserva a todos los roles.
    csv_rows = client.get("/api/v1/admin/org/users/export.csv", headers=h).text.splitlines()
    assert len(csv_rows) - 1 == 5


def test_manager_engagement(client, manager_with_reports, factory, auth_headers) -> None:
    from hg.modules.consent.models import DataAccessLog

    mw = manager_with_reports
    admin = _admin(factory, mw)
    idle = factory.make_user(org=mw.org, role=UserRole.manager, full_name="Manager Idle")
    factory.make_user(org=mw.org, role=UserRole.manager, full_name="Manager Alone")  # sin equipo
    factory.make_user(org=mw.org, manager_id=idle.id, full_name="Idle Report")
    s = factory.session
    now = datetime.now(UTC)
    s.add(DataAccessLog(  # consultó a r1 hace poco
        org_id=mw.org.id, actor_user_id=mw.manager.id, target_user_id=mw.r1.id,
        resource="progress", accessed_at=now - timedelta(days=2),
    ))
    s.add(DataAccessLog(  # consulta fuera de ventana: no cuenta
        org_id=mw.org.id, actor_user_id=idle.id, target_user_id=mw.r2.id,
        resource="progress", accessed_at=now - timedelta(days=40),
    ))
    s.add(ModuleAssignment(
        org_id=mw.org.id, user_id=mw.r2.id, learning_unit_id=mw.units[2].id,
        assigned_by_user_id=mw.manager.id,
    ))
    s.commit()
    m = client.get("/api/v1/admin/org/insights", headers=auth_headers(admin)).json()["managers"]
    assert (m["managers_with_team"], m["engaged"], m["engagement_rate"]) == (2, 1, 0.5)
    rows = {r["full_name"]: r for r in m["managers"]}
    one = rows["Manager One"]
    assert (one["team_size"], one["team_active"], one["reviewed_members"]) == (3, 1, 1)
    assert one["assignments_made"] == 1 and one["status"] == "engaged"
    assert rows["Manager Idle"]["status"] == "no_follow_up"
    assert rows["Manager Alone"]["status"] == "no_team"
    assert m["managers"][0]["status"] == "no_follow_up"  # los que requieren atención, primero
