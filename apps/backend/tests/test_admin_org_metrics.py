"""RRHH org metrics + CSV export (B4-A)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole


def test_org_metrics_collaborator_403(client: TestClient, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    res = client.get("/api/v1/admin/org/metrics", headers=auth_headers(mw.r1))
    assert res.status_code == 403


def test_org_metrics_admin_sees_own_org(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin)
    res = client.get("/api/v1/admin/org/metrics", headers=auth_headers(admin))
    assert res.status_code == 200, res.text
    body = res.json()
    # manager + r1 + r2 + r3 + admin = 5 usuarios
    assert body["total_licenses"] >= 5
    assert body["total_courses_completed"] >= 5  # r1 completó 5
    assert "P1" in body["by_pillar"]
    assert any(tp["courses_completed"] == 5 for tp in body["top_performers"])


def test_org_metrics_superadmin_can_pass_org_id(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    res = client.get(
        "/api/v1/admin/org/metrics", headers=auth_headers(sa), params={"org_id": str(mw.org.id)}
    )
    assert res.status_code == 200, res.text
    assert res.json()["total_courses_completed"] >= 5  # ve la org de mw, no la suya


def test_org_metrics_admin_cannot_inspect_other_org(client, manager_with_reports, factory, auth_headers) -> None:
    """Un admin que pasa ?org_id de otra org es ignorado: solo ve la suya (FU-12)."""
    mw = manager_with_reports  # org con 5 cursos completados
    other_org = factory.make_org()
    admin = factory.make_user(org=other_org, role=UserRole.admin)
    res = client.get(
        "/api/v1/admin/org/metrics",
        headers=auth_headers(admin),
        params={"org_id": str(mw.org.id)},
    )
    assert res.status_code == 200, res.text
    body = res.json()
    # Ve su propia org (solo el admin), no la de mw (que tiene 5 completados).
    assert body["total_courses_completed"] == 0
    assert body["total_licenses"] == 1


def test_org_metrics_csv_export_has_headers(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin)
    res = client.get("/api/v1/admin/org/users/export.csv", headers=auth_headers(admin))
    assert res.status_code == 200, res.text
    assert res.headers["content-type"].startswith("text/csv")
    first_line = res.text.splitlines()[0]
    assert "email" in first_line and "manager_email" in first_line and "courses_completed" in first_line
