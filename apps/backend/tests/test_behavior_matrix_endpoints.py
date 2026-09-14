"""FASE 1.2: endpoints de la matriz de comportamientos / evaluación del manager."""
from __future__ import annotations

from sqlalchemy import select

from hg.db import SessionLocal
from hg.modules.badges.models import DimensionLevelProgress
from hg.modules.feedback.models import BehaviorEvaluation, PillarBehavior
from hg.modules.identity.models import UserRole


def _cp_behavior_id() -> str:
    """El seed de CE-10 siempre trae comportamientos de CP — tomamos el primero."""
    s = SessionLocal()
    try:
        b = s.scalar(select(PillarBehavior).where(PillarBehavior.dimension_code == "CP").limit(1))
        assert b is not None, "seed de pillar_behaviors CP no encontrado — corrió CE-10?"
        return str(b.id)
    finally:
        s.close()


def _cleanup_evaluations(user_ids: list) -> None:
    s = SessionLocal()
    s.execute(BehaviorEvaluation.__table__.delete().where(BehaviorEvaluation.user_id.in_(user_ids)))
    s.commit()
    s.close()


def test_manager_sees_behavior_matrix_for_report(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    res = client.get(f"/api/v1/admin/users/{report.id}/behavior-matrix", headers=auth_headers(mgr))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["dimension_code"] == "CP"  # único contenido publicado hoy
    assert len(body["pillars"]) >= 1
    assert body["manager_weight"] == 0.0  # default FASE 1.1, inerte


def test_manager_evaluates_report_and_score_reflects_it(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    behavior_id = _cp_behavior_id()
    try:
        res = client.put(
            f"/api/v1/admin/users/{report.id}/behavior-evaluations",
            headers=auth_headers(mgr),
            json={"evaluations": [{"behavior_id": behavior_id, "rating": 3}]},
        )
        assert res.status_code == 200, res.text
        assert res.json()["manager_pct"] == 100.0

        s = SessionLocal()
        row = s.scalar(
            select(DimensionLevelProgress).where(
                DimensionLevelProgress.user_id == report.id,
                DimensionLevelProgress.dimension_code == "CP",
                DimensionLevelProgress.level_code == "L1",
            )
        )
        assert row is not None
        assert row.manager_pct == 100.0  # persistido aunque manager_weight=0 no lo pese aún
        s.close()

        s = SessionLocal()
        stored = s.scalar(
            select(BehaviorEvaluation).where(
                BehaviorEvaluation.user_id == report.id, BehaviorEvaluation.behavior_id == behavior_id
            )
        )
        assert stored.evaluated_by_user_id == mgr.id
        s.close()
    finally:
        _cleanup_evaluations([report.id])


def test_manager_cannot_evaluate_non_report(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    stranger = factory.make_user(org=org, role=UserRole.collaborator)
    behavior_id = _cp_behavior_id()
    res = client.put(
        f"/api/v1/admin/users/{stranger.id}/behavior-evaluations",
        headers=auth_headers(mgr),
        json={"evaluations": [{"behavior_id": behavior_id, "rating": 3}]},
    )
    assert res.status_code == 404


def test_invalid_rating_rejected(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    behavior_id = _cp_behavior_id()
    res = client.put(
        f"/api/v1/admin/users/{report.id}/behavior-evaluations",
        headers=auth_headers(mgr),
        json={"evaluations": [{"behavior_id": behavior_id, "rating": 5}]},
    )
    assert res.status_code == 422


def test_company_admin_cannot_view_matrix_yet(client, factory, auth_headers) -> None:
    """v1 no implementa la visibilidad de company_admin sobre la matriz
    (cross-org requeriría el patrón ``get_db_as_superadmin`` de
    ``company/router.py`` — ver decisión abierta #4 del plan). 403 porque el
    rol no está en ``_EVALUATE_ROLES``, mismo criterio que
    ``assignments_router`` (que tampoco incluye company_admin)."""
    company = factory.make_company()
    org_a = factory.make_org(company=company)
    org_b = factory.make_org(company=company)
    company_admin = factory.make_user(org=org_a, role=UserRole.company_admin)
    collaborator = factory.make_user(org=org_b, role=UserRole.collaborator)

    viewed = client.get(
        f"/api/v1/admin/users/{collaborator.id}/behavior-matrix", headers=auth_headers(company_admin)
    )
    assert viewed.status_code == 403


def test_collaborator_cannot_view_others_matrix(client, factory, auth_headers) -> None:
    org = factory.make_org()
    collab = factory.make_user(org=org, role=UserRole.collaborator)
    other = factory.make_user(org=org, role=UserRole.collaborator)
    res = client.get(f"/api/v1/admin/users/{other.id}/behavior-matrix", headers=auth_headers(collab))
    assert res.status_code == 403


def test_me_behavior_feedback_returns_own_ratings(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    behavior_id = _cp_behavior_id()
    try:
        client.put(
            f"/api/v1/admin/users/{report.id}/behavior-evaluations",
            headers=auth_headers(mgr),
            json={"evaluations": [{"behavior_id": behavior_id, "rating": 2}]},
        )
        mine = client.get("/api/v1/me/behavior-feedback", headers=auth_headers(report))
        assert mine.status_code == 200
        assert len(mine.json()) == 1
        assert mine.json()[0]["rating"] == 2
    finally:
        _cleanup_evaluations([report.id])
