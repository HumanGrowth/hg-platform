"""Capa Empresa · TASK 5 (v2 granular): consentimiento + gate + auditoría.

- El colaborador decide en ``/me/consent`` dos autorizaciones independientes
  (jefe directo + RRHH); "Ahora no" = ambos False.
- RRHH (roster) ve el estado individual solo con ``consent_hr``; el manager
  (detalle) solo con ``consent_manager``. Sin autorización → vacío + un
  ``consent_status`` de 4 valores (pending/declined/…).
- Cada consulta de RRHH/manager escribe en ``data_access_log``.
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from hg.modules.assessment.enums import DimensionCode, ResultSource
from hg.modules.assessment.models import DimensionResult
from hg.modules.consent.models import ConsentChangeLog, DataAccessLog, UserPrivacyConsent
from hg.modules.identity.models import UserRole

API = "/api/v1"


def _seed_state(factory, user) -> None:
    """Un DimensionResult (estado) para que el snapshot del user no sea vacío."""
    now = datetime.now(UTC)
    factory.session.add(
        DimensionResult(
            org_id=user.org_id, user_id=user.id, dimension_code=DimensionCode.P1,
            source=ResultSource.preliminary, state_code="solido", state_label="Sólido",
            sub_scores={}, derived_at=now, next_retake_eligible_at=now,
        )
    )
    factory.session.commit()


def _set_consent(factory, user, *, manager: bool | None, hr: bool | None) -> None:
    factory.session.add(
        UserPrivacyConsent(
            org_id=user.org_id, user_id=user.id, consent_manager=manager, consent_hr=hr
        )
    )
    factory.session.commit()


# ─────────────────────────── /me/consent ───────────────────────────


def test_consent_status_and_set_granular(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)

    status = client.get(f"{API}/me/consent", headers=auth_headers(user)).json()
    assert status["consent_manager"] is None and status["consent_hr"] is None

    # Autoriza ambos.
    res = client.post(
        f"{API}/me/consent",
        headers=auth_headers(user),
        json={"consent_manager": True, "consent_hr": True},
    ).json()
    assert res["consent_manager"] is True and res["consent_hr"] is True
    assert res["updated_at"] is not None

    # "Ahora no" → ambos False (no None: distingue declinó de nunca-vio).
    res2 = client.post(
        f"{API}/me/consent",
        headers=auth_headers(user),
        json={"consent_manager": False, "consent_hr": False},
    ).json()
    assert res2["consent_manager"] is False and res2["consent_hr"] is False

    # Cada cambio quedó en el log de auditoría.
    logged = factory.session.scalar(
        select(func.count()).select_from(ConsentChangeLog).where(
            ConsentChangeLog.user_id == user.id
        )
    )
    assert logged >= 2  # manager+hr en el primer set (None→True), +2 en el segundo


# ─────────────────────────── Gate RRHH (roster) ───────────────────────────


def test_roster_gate_and_consent_status(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    ca = factory.make_user(org=org, role=UserRole.company_admin)
    member = factory.make_user(org=org, full_name="Colaborador Uno")
    _seed_state(factory, member)

    def _row():
        res = client.get(f"{API}/company/members", headers=auth_headers(ca))
        assert res.status_code == 200, res.text
        return next(m for m in res.json() if m["id"] == str(member.id))

    # Sin fila de consentimiento → pending, estados vacíos.
    row = _row()
    assert row["consent_status"] == "pending"
    assert row["dimension_states"] == {}

    # Autoriza a RRHH → estado visible; status authorized_no_activity (sin cursos).
    _set_consent(factory, member, manager=None, hr=True)
    row = _row()
    assert row["consent_status"] == "authorized_no_activity"
    assert row["dimension_states"] != {}


def test_roster_declined_status(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    ca = factory.make_user(org=org, role=UserRole.company_admin)
    member = factory.make_user(org=org)
    _seed_state(factory, member)
    _set_consent(factory, member, manager=False, hr=False)  # "Ahora no"
    res = client.get(f"{API}/company/members", headers=auth_headers(ca))
    row = next(m for m in res.json() if m["id"] == str(member.id))
    assert row["consent_status"] == "declined"
    assert row["dimension_states"] == {}


def test_roster_access_is_audited(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    ca = factory.make_user(org=org, role=UserRole.company_admin)
    factory.make_user(org=org)
    client.get(f"{API}/company/members", headers=auth_headers(ca))
    logged = factory.session.scalar(
        select(func.count()).select_from(DataAccessLog).where(
            DataAccessLog.actor_user_id == ca.id, DataAccessLog.resource == "roster"
        )
    )
    assert logged >= 1


# ─────────────────────────── Gate manager (detalle) ───────────────────────────


def test_manager_detail_gate_uses_consent_manager(
    client: TestClient, factory, auth_headers
) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id, full_name="Reporte Uno")
    _seed_state(factory, report)
    url = f"{API}/manager/users/{report.id}/detail"

    # Sin consentimiento del jefe → sin estado.
    assert client.get(url, headers=auth_headers(mgr)).json()["assessment_states"] == {}

    # Autoriza SOLO a RRHH (no al jefe) → el manager sigue sin ver (granular).
    _set_consent(factory, report, manager=False, hr=True)
    assert client.get(url, headers=auth_headers(mgr)).json()["assessment_states"] == {}

    # Autoriza al jefe → ahora sí.
    factory.session.query(UserPrivacyConsent).filter(
        UserPrivacyConsent.user_id == report.id
    ).update({"consent_manager": True})
    factory.session.commit()
    with_consent = client.get(url, headers=auth_headers(mgr))
    assert with_consent.json()["assessment_states"] != {}

    logged = factory.session.scalar(
        select(func.count()).select_from(DataAccessLog).where(
            DataAccessLog.actor_user_id == mgr.id,
            DataAccessLog.target_user_id == report.id,
            DataAccessLog.resource == "assessment_state",
        )
    )
    assert logged >= 1
