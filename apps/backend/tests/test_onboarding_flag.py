"""users.has_seen_onboarding + POST /auth/me/onboarding-seen (Release TASK 6)."""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_me_defaults_to_not_seen(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org())
    res = client.get("/api/v1/auth/me", headers=auth_headers(user))
    assert res.status_code == 200
    assert res.json()["has_seen_onboarding"] is False


def test_set_and_reset_onboarding_seen(client: TestClient, factory, auth_headers) -> None:
    user = factory.make_user(org=factory.make_org())
    headers = auth_headers(user)

    seen = client.post("/api/v1/auth/me/onboarding-seen", headers=headers, json={"seen": True})
    assert seen.status_code == 200
    assert seen.json()["has_seen_onboarding"] is True

    reset = client.post("/api/v1/auth/me/onboarding-seen", headers=headers, json={"seen": False})
    assert reset.json()["has_seen_onboarding"] is False


def test_onboarding_seen_requires_auth(client: TestClient) -> None:
    assert client.post("/api/v1/auth/me/onboarding-seen", json={"seen": True}).status_code in (401, 403)


def test_has_completed_onboarding_reflects_results(client: TestClient, factory, auth_headers) -> None:
    """/me.has_completed_onboarding = tiene >=1 resultado de assessment. El
    SessionGate del frontend lo usa para mandar al assessment inicial si falta."""
    from datetime import UTC, datetime, timedelta

    from hg.modules.assessment.enums import DimensionCode
    from hg.modules.assessment.models import DimensionResult

    org = factory.make_org()
    user = factory.make_user(org=org)

    # sin resultados → False (el gate redirige al onboarding).
    res = client.get("/api/v1/auth/me", headers=auth_headers(user))
    assert res.status_code == 200
    assert res.json()["has_completed_onboarding"] is False

    # con un resultado preliminar → True.
    factory.session.add(
        DimensionResult(
            org_id=org.id, user_id=user.id, dimension_code=DimensionCode.P1,
            state_code="L3", state_label="Nivel 3", sub_scores={},
            next_retake_eligible_at=datetime.now(UTC) + timedelta(days=30),
        )
    )
    factory.session.commit()
    res2 = client.get("/api/v1/auth/me", headers=auth_headers(user))
    assert res2.json()["has_completed_onboarding"] is True
