"""Actualización de PillarResult (B2-03): confirm N4, recaída, upgrade de source."""
from __future__ import annotations

from fastapi.testclient import TestClient

from tests.assessment_helpers import P3_N3_ANSWERS, run_session


def _p3_detail(client, headers) -> dict:
    run_session(client, headers, "onboarding_short")
    return run_session(client, headers, "pillar_detail", target_pillar="P3", answers=P3_N3_ANSWERS)


def test_n3_candidate_requires_confirmation(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    out = _p3_detail(client, auth_headers(user))
    p3 = out["results"][0]
    assert p3["state_code"] == "N3"
    assert p3["requires_user_confirmation"] is True


def test_confirm_upgrades_n3_to_n4(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    _p3_detail(client, h)
    res = client.post("/api/v1/assessment/me/results/P3/confirm", headers=h)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["state_code"] == "N4"
    assert body["requires_user_confirmation"] is False
    assert body["user_confirmed_at"] is not None


def test_p4_recaida_detected(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    run_session(client, h, "onboarding_short")
    # E5 declarado pero conducta 0 → recaída en todos los dominios
    answers = {
        "PRO-1b": 5, "PRO-1a": 0, "PRO-2b": 5, "PRO-2a": 0,
        "PRO-3b": 5, "PRO-3a": 0, "PRO-4b": 5, "PRO-4a": 0,
    }
    out = run_session(client, h, "pillar_detail", target_pillar="P4", answers=answers)
    assert out["results"][0]["recaida_detected"] is True


def test_preliminary_upgrades_to_confirmed(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    run_session(client, h, "onboarding_short")
    before = {r["pillar_code"]: r for r in client.get(
        "/api/v1/assessment/me/results", headers=h
    ).json()["results"]}
    assert before["P2"]["source"] == "preliminary"
    run_session(client, h, "pillar_detail", target_pillar="P2")
    after = {r["pillar_code"]: r for r in client.get(
        "/api/v1/assessment/me/results", headers=h
    ).json()["results"]}
    assert after["P2"]["source"] == "confirmed"
    assert len(after) == 7  # sigue habiendo 7 pilares (P2 actualizado, no duplicado)
