"""Privacidad del assessment (B2-03): RLS + manager ve estados, no respuestas."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole
from tests.assessment_helpers import run_session


def test_user_cannot_access_others_session(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    a = factory.make_user(org=org)
    b = factory.make_user(org=org)
    session = client.post(
        "/api/v1/assessment/sessions", headers=auth_headers(a), json={"kind": "onboarding_short"}
    ).json()
    res = client.get(f"/api/v1/assessment/sessions/{session['id']}", headers=auth_headers(b))
    assert res.status_code == 404


def test_me_results_only_own(client, factory, auth_headers) -> None:
    org = factory.make_org()
    a = factory.make_user(org=org)
    b = factory.make_user(org=org)
    run_session(client, auth_headers(a), "onboarding_short")
    # b no hizo nada → sin resultados
    res = client.get("/api/v1/assessment/me/results", headers=auth_headers(b))
    assert res.json()["results"] == []


def test_manager_detail_shows_states_not_responses(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    run_session(client, auth_headers(report), "onboarding_short")
    res = client.get(f"/api/v1/manager/users/{report.id}/detail", headers=auth_headers(mgr))
    assert res.status_code == 200, res.text
    body = res.json()
    assert "assessment_states" in body
    assert body["assessment_states"].get("P1", {}).get("state")
    # No expone respuestas item-by-item.
    assert "assessment_responses" not in body
    assert "responses" not in body


def test_cross_org_session_not_visible(client, factory, auth_headers) -> None:
    org_a = factory.make_org()
    org_b = factory.make_org()
    a = factory.make_user(org=org_a)
    b = factory.make_user(org=org_b)
    session = client.post(
        "/api/v1/assessment/sessions", headers=auth_headers(a), json={"kind": "onboarding_short"}
    ).json()
    res = client.get(f"/api/v1/assessment/sessions/{session['id']}", headers=auth_headers(b))
    assert res.status_code == 404
