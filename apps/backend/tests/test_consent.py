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
from sqlalchemy import func, select, text

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


# ─────────────────────────── /manager/users/{id}/progression (H4) ───────────────────────────


def _progression_fixture(factory):
    """Manager + reporte con 1 unit L1 completada (learning=100) y assessment P1 L6
    (=100): completion mezclado L1 = 100; solo aprendizaje L1 = lo que da learning_pct."""
    from hg.modules.badges import progression

    from ._lu_helpers import make_unit, seed_attempt

    s = factory.session
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    seed_attempt(s, org_id=org.id, user_id=report.id, unit=unit, when=datetime.now(UTC), completed=True)
    now = datetime.now(UTC)
    s.add(
        DimensionResult(
            org_id=org.id, user_id=report.id, dimension_code=DimensionCode.P1,
            source=ResultSource.preliminary, state_code="L1", state_label="L1",
            sub_scores={}, derived_at=now, next_retake_eligible_at=now,
        )
    )
    s.commit()
    progression.recompute_dimension(s, report, "CP")
    s.commit()
    return mgr, report, unit


def _cp(rows):
    return next(r for r in rows if r["dimension_code"] == "CP")


def test_manager_progression_without_consent_shows_learning_only(client, factory, auth_headers) -> None:
    from ._lu_helpers import cleanup_units

    mgr, report, unit = _progression_fixture(factory)
    try:
        res = client.get(f"/api/v1/manager/users/{report.id}/progression", headers=auth_headers(mgr))
        assert res.status_code == 200, res.text
        cp = _cp(res.json())
        assert cp["includes_assessment"] is False
        # El assessment (L1 = 17) NO entra: el % es el de aprendizaje puro.
        db_row = factory.session.execute(
            text("select learning_pct, completion_pct from dimension_level_progress "
                 "where user_id = :u and dimension_code = 'CP' and level_code = 'L1'"),
            {"u": report.id},
        ).one()
        assert cp["levels"][0]["completion_pct"] == round(db_row.learning_pct, 1)
        assert db_row.completion_pct != db_row.learning_pct  # el mezclado sí difiere
        # La consulta queda auditada.
        assert factory.session.scalar(
            select(func.count()).select_from(DataAccessLog).where(
                DataAccessLog.target_user_id == report.id, DataAccessLog.resource == "progress"
            )
        ) == 1
    finally:
        cleanup_units(factory.session, [unit.id])


def test_manager_progression_with_consent_matches_what_the_collaborator_sees(
    client, factory, auth_headers
) -> None:
    from ._lu_helpers import cleanup_units

    mgr, report, unit = _progression_fixture(factory)
    _set_consent(factory, report, manager=True, hr=False)
    try:
        as_manager = client.get(f"/api/v1/manager/users/{report.id}/progression", headers=auth_headers(mgr))
        as_self = client.get("/api/v1/me/progression", headers=auth_headers(report))
        assert as_manager.status_code == 200 and as_self.status_code == 200
        assert _cp(as_manager.json())["includes_assessment"] is True
        # Misma fuente, mismo número para manager y colaborador.
        assert _cp(as_manager.json())["levels"] == _cp(as_self.json())["levels"]
    finally:
        cleanup_units(factory.session, [unit.id])


def test_manager_progression_forbidden_outside_team(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    stranger = factory.make_user(org=org)  # no es reporte de mgr
    res = client.get(f"/api/v1/manager/users/{stranger.id}/progression", headers=auth_headers(mgr))
    assert res.status_code in (403, 404)
