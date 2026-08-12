"""Sesiones de assessment (B2-03): start/respond/finalize + validaciones."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole
from tests.assessment_helpers import run_session


def test_start_onboarding_short_ok(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    res = client.post(
        "/api/v1/assessment/sessions", headers=auth_headers(user),
        json={"kind": "onboarding_short"},
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["total_items"] == 18
    assert body["next_item"] is not None


def test_start_pillar_detail_requires_preliminary(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    res = client.post(
        "/api/v1/assessment/sessions", headers=auth_headers(user),
        json={"kind": "pillar_detail", "target_pillar": "P2"},
    )
    assert res.status_code == 422  # sin preliminary previo


def test_start_onboarding_blocked_if_completed(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    run_session(client, h, "onboarding_short")
    res = client.post("/api/v1/assessment/sessions", headers=h, json={"kind": "onboarding_short"})
    assert res.status_code == 422  # ya completado


def test_response_out_of_range_422(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    session = client.post(
        "/api/v1/assessment/sessions", headers=h, json={"kind": "onboarding_short"}
    ).json()
    item = session["next_item"]
    res = client.post(
        f"/api/v1/assessment/sessions/{session['id']}/respond",
        headers=h,
        json={"item_id": item["id"], "response_value": 999},
    )
    assert res.status_code == 422


def test_finalize_requires_all_responses_422(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    session = client.post(
        "/api/v1/assessment/sessions", headers=h, json={"kind": "onboarding_short"}
    ).json()
    # responder solo 1 item, luego finalizar
    item = session["next_item"]
    client.post(
        f"/api/v1/assessment/sessions/{session['id']}/respond",
        headers=h, json={"item_id": item["id"], "response_value": item["scale_min"] or item["options"][0]["value"]},
    )
    res = client.post(f"/api/v1/assessment/sessions/{session['id']}/finalize", headers=h)
    assert res.status_code == 422


def test_finalize_creates_results_and_profile(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    out = run_session(client, h, "onboarding_short")
    pillars = {r["pillar_code"] for r in out["results"]}
    assert pillars == {"P1", "P2", "P3", "P4", "P5", "P6A", "P6B"}
    assert all(r["source"] == "preliminary" for r in out["results"])
    # /me/results refleja el snapshot
    res = client.get("/api/v1/assessment/me/results", headers=h)
    assert res.status_code == 200
    assert len(res.json()["results"]) == 7


def test_pillar_detail_after_preliminary_ok(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    h = auth_headers(user)
    run_session(client, h, "onboarding_short")  # crea preliminary
    out = run_session(client, h, "pillar_detail", target_pillar="P2")
    assert out["results"][0]["pillar_code"] == "P2"
    assert out["results"][0]["source"] == "confirmed"


def test_rrhh_can_reset_retake(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    admin = factory.make_user(org=org, role=UserRole.admin)
    h = auth_headers(user)
    run_session(client, h, "onboarding_short")
    run_session(client, h, "pillar_detail", target_pillar="P2")  # confirmed (retake en 30d)
    # re-take inmediato debe estar bloqueado
    blocked = client.post(
        "/api/v1/assessment/sessions", headers=h,
        json={"kind": "pillar_detail", "target_pillar": "P2"},
    )
    assert blocked.status_code == 422
    # RRHH resetea
    reset = client.post(
        f"/api/v1/assessment/admin/users/{user.id}/reset-retake/P2", headers=auth_headers(admin)
    )
    assert reset.status_code == 204
    ok = client.post(
        "/api/v1/assessment/sessions", headers=h,
        json={"kind": "pillar_detail", "target_pillar": "P2"},
    )
    assert ok.status_code == 201
