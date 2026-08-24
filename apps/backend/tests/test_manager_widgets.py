"""GET /api/v1/manager/me/widgets — team activity + inactivity buckets. B4-E."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


@pytest.fixture
def manager_buckets(factory):
    """Manager con 6 reportes, uno por bucket de inactividad."""
    s = factory.session
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager, full_name="Bucket Mgr")
    now = datetime.now(UTC)
    unit_ids: list = []

    def report(name: str, gap_days: int | None):
        u = factory.make_user(org=org, manager_id=mgr.id, full_name=name)
        if gap_days is not None:
            unit = make_unit(s, dimension_code="CP")
            unit_ids.append(unit.id)
            seed_attempt(
                s, org_id=org.id, user_id=u.id, unit=unit,
                when=now - timedelta(days=gap_days), completed=False,
            )
        return u

    # Un usuario por bucket (alineado a 21d): active_7d / d8_21 / d22_30 / gt_30 / never.
    r_active = report("R Active", 3)
    r_8_21 = report("R 8-21", 14)
    r_22_30 = report("R 22-30", 25)
    r_gt30 = report("R gt30", 40)
    r_never = report("R Never", None)

    from types import SimpleNamespace
    yield SimpleNamespace(
        org=org, mgr=mgr,
        ids={r_active.id, r_8_21.id, r_22_30.id, r_gt30.id, r_never.id},
    )
    cleanup_units(s, unit_ids)


def test_manager_widgets_only_direct_reports(client: TestClient, manager_with_reports, auth_headers) -> None:
    mw = manager_with_reports
    body = client.get("/api/v1/manager/me/widgets", headers=auth_headers(mw.manager)).json()
    report_ids = {str(mw.r1.id), str(mw.r2.id), str(mw.r3.id)}
    cell_ids = {c["user_id"] for c in body["team_activity"]}
    assert cell_ids.issubset(report_ids)
    assert str(mw.manager.id) not in cell_ids


def test_manager_widgets_inactivity_buckets_classification(client, manager_buckets, auth_headers) -> None:
    body = client.get(
        "/api/v1/manager/me/widgets", headers=auth_headers(manager_buckets.mgr)
    ).json()
    b = body["inactivity_buckets"]
    assert b["active_7d"] == 1
    assert b["d8_21"] == 1
    assert b["d22_30"] == 1
    assert b["gt_30"] == 1
    assert b["never_active"] == 1


def test_manager_widgets_admin_sees_all_managers_of_org(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    admin = factory.make_user(org=mw.org, role=UserRole.admin, full_name="Org Admin")
    body = client.get("/api/v1/manager/me/widgets", headers=auth_headers(admin)).json()
    b = body["inactivity_buckets"]
    total = sum(b.values())
    # admin ve toda la org como equipo extendido: manager + r1 + r2 + r3 (>= 4)
    assert total >= 4
    cell_ids = {c["user_id"] for c in body["team_activity"]}
    assert str(mw.r1.id) in cell_ids  # r1 tuvo actividad reciente


def test_manager_widgets_collaborator_empty(client, manager_with_reports, factory, auth_headers) -> None:
    mw = manager_with_reports
    loner = factory.make_user(org=mw.org, role=UserRole.collaborator, full_name="Loner")
    body = client.get("/api/v1/manager/me/widgets", headers=auth_headers(loner)).json()
    assert body["team_activity"] == []
    assert sum(body["inactivity_buckets"].values()) == 0
