"""Capa Empresa · TASK 5: consentimiento + gate de privacidad + auditoría.

- El colaborador acepta el consentimiento en ``/me/consent`` (idempotente).
- Sin consentimiento vigente, RRHH (roster) y el manager (detalle) NO ven el
  `state` individual (queda vacío "sin datos"); con consentimiento, sí.
- Cada consulta de RRHH/manager al estado/roster escribe en ``data_access_log``.
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi.testclient import TestClient
from sqlalchemy import func, select

from hg.modules.assessment.enums import DimensionCode, ResultSource
from hg.modules.assessment.models import DimensionResult
from hg.modules.consent.models import DataAccessLog, UserConsent
from hg.modules.consent.service import CURRENT_CONSENT_VERSION
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


def _consent(factory, user) -> None:
    factory.session.add(
        UserConsent(org_id=user.org_id, user_id=user.id, consent_version=CURRENT_CONSENT_VERSION)
    )
    factory.session.commit()


# ─────────────────────────── /me/consent ───────────────────────────


def test_consent_status_and_accept_idempotent(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)

    status = client.get(f"{API}/me/consent", headers=auth_headers(user)).json()
    assert status["accepted"] is False
    assert status["current_version"] == CURRENT_CONSENT_VERSION

    accepted = client.post(f"{API}/me/consent", headers=auth_headers(user)).json()
    assert accepted["accepted"] is True
    assert accepted["accepted_at"] is not None

    # Idempotente: re-aceptar no crea una segunda fila.
    client.post(f"{API}/me/consent", headers=auth_headers(user))
    count = factory.session.scalar(
        select(func.count()).select_from(UserConsent).where(UserConsent.user_id == user.id)
    )
    assert count == 1


# ─────────────────────────── Gate RRHH (roster) ───────────────────────────


def test_roster_hides_state_without_consent(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    ca = factory.make_user(org=org, role=UserRole.company_admin)
    member = factory.make_user(org=org, full_name="Colaborador Uno")
    _seed_state(factory, member)

    def _member_row():
        res = client.get(f"{API}/company/members", headers=auth_headers(ca))
        assert res.status_code == 200, res.text
        return next(m for m in res.json() if m["id"] == str(member.id))

    # Sin consentimiento → estados vacíos.
    assert _member_row()["dimension_states"] == {}

    # Con consentimiento → el estado aparece.
    _consent(factory, member)
    assert _member_row()["dimension_states"] != {}


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


def test_manager_detail_gate_and_audit(client: TestClient, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id, full_name="Reporte Uno")
    _seed_state(factory, report)

    url = f"{API}/manager/users/{report.id}/detail"

    without = client.get(url, headers=auth_headers(mgr))
    assert without.status_code == 200, without.text
    assert without.json()["assessment_states"] == {}

    _consent(factory, report)
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
