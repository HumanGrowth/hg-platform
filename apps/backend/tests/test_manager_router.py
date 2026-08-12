"""Manager router — team + detail (B4-A)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole


def test_get_team_returns_direct_reports_only(client: TestClient, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    res = client.get("/api/v1/manager/me/team", headers=auth_headers(mw.manager))
    assert res.status_code == 200, res.text
    body = res.json()
    ids = {m["id"] for m in body["items"]}
    assert ids == {str(mw.r1.id), str(mw.r2.id), str(mw.r3.id)}
    assert body["total"] == 3


def test_get_team_pagination(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    res = client.get(
        "/api/v1/manager/me/team", headers=auth_headers(mw.manager), params={"page_size": 2}
    )
    body = res.json()
    assert len(body["items"]) == 2
    assert body["total"] == 3


def test_get_team_sort_by_last_active(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    body = client.get(
        "/api/v1/manager/me/team", headers=auth_headers(mw.manager), params={"sort": "last_active"}
    ).json()
    ids = [m["id"] for m in body["items"]]
    # r1 (reciente) primero, r3 (nunca activo) último (NULLS LAST)
    assert ids[0] == str(mw.r1.id)
    assert ids[-1] == str(mw.r3.id)


def test_get_team_filter_inactive_only(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    body = client.get(
        "/api/v1/manager/me/team",
        headers=auth_headers(mw.manager),
        params={"inactive_only": "true"},
    ).json()
    ids = {m["id"] for m in body["items"]}
    assert str(mw.r1.id) not in ids  # r1 activo
    assert {str(mw.r2.id), str(mw.r3.id)}.issubset(ids)  # inactivo + nunca activo
    assert body["inactive_count"] >= 2


def test_get_team_admin_sees_all_managers_of_org(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin, full_name="Org Admin")
    body = client.get("/api/v1/manager/me/team", headers=auth_headers(admin)).json()
    ids = {m["id"] for m in body["items"]}
    # admin ve toda la org: el manager y sus reportes
    assert str(mw.manager.id) in ids
    assert {str(mw.r1.id), str(mw.r2.id), str(mw.r3.id)}.issubset(ids)


def test_get_team_user_with_no_reports_returns_empty(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    loner = factory.make_user(org=mw.org, role=UserRole.collaborator)
    body = client.get("/api/v1/manager/me/team", headers=auth_headers(loner)).json()
    assert body["items"] == []
    assert body["total"] == 0


def test_get_user_detail_includes_enrollments_and_progress(client, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    h = auth_headers(mw.manager)
    client.post(f"/api/v1/manager/users/{mw.r1.id}/enroll", headers=h, json={"career_path_code": "P1"})
    res = client.get(f"/api/v1/manager/users/{mw.r1.id}/detail", headers=h)
    assert res.status_code == 200, res.text
    body = res.json()
    assert any(e["career_path_code"] == "P1" for e in body["enrollments"])
    assert len(body["courses_completed_list"]) == 5
    assert body["courses_completed"] == 5
    assert "P1" in body["pillar_completion_rate"]


def test_get_user_detail_not_my_report_404(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    # un user de la misma org pero que NO reporta al manager
    stranger = factory.make_user(org=mw.org, role=UserRole.collaborator)
    res = client.get(f"/api/v1/manager/users/{stranger.id}/detail", headers=auth_headers(mw.manager))
    assert res.status_code == 404
