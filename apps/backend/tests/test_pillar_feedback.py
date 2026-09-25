"""PF-01: feedback del manager por pilar (visible para el colaborador)."""
from __future__ import annotations

from hg.db import SessionLocal
from hg.modules.feedback.models import PillarFeedback
from hg.modules.identity.models import UserRole


def _cleanup(user_ids: list) -> None:
    s = SessionLocal()
    s.execute(PillarFeedback.__table__.delete().where(PillarFeedback.user_id.in_(user_ids)))
    s.commit()
    s.close()


def _put(client, headers, user_id, text="Buen avance, seguí así.", pillar="P1"):
    return client.put(
        f"/api/v1/admin/users/{user_id}/pillar-feedback",
        headers=headers,
        json={"dimension_code": "CP", "pillar_code": pillar, "text": text},
    )


def test_manager_upserts_and_collaborator_reads_feedback(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    try:
        res = _put(client, auth_headers(mgr), report.id)
        assert res.status_code == 200, res.text
        assert res.json()["manager_name"] == mgr.full_name

        # upsert: un solo feedback vigente por pilar
        res = _put(client, auth_headers(mgr), report.id, text="Versión 2")
        assert res.status_code == 200, res.text

        res = client.get(f"/api/v1/admin/users/{report.id}/pillar-feedback", headers=auth_headers(mgr))
        assert [f["text"] for f in res.json()] == ["Versión 2"]

        # el colaborador SÍ lo ve (a diferencia de las notas por comportamiento)
        res = client.get("/api/v1/me/pillar-feedback", headers=auth_headers(report))
        assert res.status_code == 200, res.text
        body = res.json()
        assert len(body) == 1 and body[0]["text"] == "Versión 2" and body[0]["pillar_code"] == "P1"
    finally:
        _cleanup([report.id])


def test_manager_cannot_write_feedback_for_non_report(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    stranger = factory.make_user(org=org)
    assert _put(client, auth_headers(mgr), stranger.id).status_code == 404


def test_collaborator_cannot_write_feedback(client, factory, auth_headers) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org)
    assert _put(client, auth_headers(user), user.id).status_code == 403


def test_feedback_validation(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    report = factory.make_user(org=org, manager_id=mgr.id)
    h = auth_headers(mgr)
    assert _put(client, h, report.id, text="   ").status_code == 422
    assert _put(client, h, report.id, text="x" * 2001).status_code == 422
    assert _put(client, h, report.id, pillar="P99").status_code == 422


def test_my_pillar_feedback_is_scoped_to_the_user(client, factory, auth_headers) -> None:
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager)
    a = factory.make_user(org=org, manager_id=mgr.id)
    b = factory.make_user(org=org, manager_id=mgr.id)
    try:
        assert _put(client, auth_headers(mgr), a.id).status_code == 200
        assert client.get("/api/v1/me/pillar-feedback", headers=auth_headers(b)).json() == []
    finally:
        _cleanup([a.id, b.id])
