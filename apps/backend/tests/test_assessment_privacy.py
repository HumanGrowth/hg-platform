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
    from hg.modules.consent.models import UserPrivacyConsent

    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    run_session(client, auth_headers(report), "onboarding_short")
    # TASK 5 v2: el manager ve el estado solo si el reporte autorizó a su jefe.
    factory.session.add(
        UserPrivacyConsent(org_id=org.id, user_id=report.id, consent_manager=True, consent_hr=None)
    )
    factory.session.commit()
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


def test_manager_results_gated_same_as_detail_states(client, factory, auth_headers) -> None:
    """GET /manager/users/{id}/results — mismo gate de consentimiento que
    `assessment_states` en /detail, mismo shape que /me/results del propio
    colaborador (para armar el mismo "plan de acción" que /dimensiones/{code})."""
    from hg.modules.consent.models import UserPrivacyConsent

    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    run_session(client, auth_headers(report), "onboarding_short")

    # Sin consentimiento: lista vacía, no 403 (el manager sabe que existe el
    # reporte, solo no ve sus resultados).
    res = client.get(f"/api/v1/manager/users/{report.id}/results", headers=auth_headers(mgr))
    assert res.status_code == 200, res.text
    assert res.json() == []

    factory.session.add(
        UserPrivacyConsent(org_id=org.id, user_id=report.id, consent_manager=True, consent_hr=None)
    )
    factory.session.commit()

    res2 = client.get(f"/api/v1/manager/users/{report.id}/results", headers=auth_headers(mgr))
    assert res2.status_code == 200, res2.text
    body = res2.json()
    assert len(body) > 0
    row = next(r for r in body if r["dimension_code"] == "P1")
    # Mismo shape que /me/results — incluye lo que /me/results tiene y el
    # snapshot de /detail no: suggested_next_step.
    assert "suggested_next_step" in row
    assert "state_code" in row and "state_label" in row


def test_manager_results_not_my_report_404(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    stranger = factory.make_user(org=org)
    res = client.get(f"/api/v1/manager/users/{stranger.id}/results", headers=auth_headers(mgr))
    assert res.status_code == 404
