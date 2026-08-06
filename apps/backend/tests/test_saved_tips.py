"""Plan de Acción · tips guardados /me/tips (cierre-beta TASK 5)."""
from __future__ import annotations

from fastapi.testclient import TestClient

from hg.modules.identity.models import UserRole


def _user(factory):
    return factory.make_user(org=factory.make_org(), role=UserRole.collaborator)


def test_save_list_filter_and_complete(client: TestClient, factory, auth_headers) -> None:
    user = _user(factory)
    h = auth_headers(user)
    a = client.post("/api/v1/me/tips", headers=h, json={
        "tip_text": "Probar feedback semanal", "source": "solution", "dimension_code": "CP",
    })
    assert a.status_code == 201, a.text
    assert a.json()["dimension_code"] == "CP"
    client.post("/api/v1/me/tips", headers=h, json={"tip_text": "Otra idea", "source": "custom", "dimension_code": "PR"})

    allt = client.get("/api/v1/me/tips", headers=h).json()
    assert len(allt) == 2
    cp = client.get("/api/v1/me/tips", headers=h, params={"dimension": "CP"}).json()
    assert len(cp) == 1 and cp[0]["dimension_code"] == "CP"

    # marcar completado → completed_at no nulo + filtro completed
    tid = a.json()["id"]
    patched = client.patch(f"/api/v1/me/tips/{tid}", headers=h, json={"is_completed": True})
    assert patched.json()["is_completed"] is True
    assert patched.json()["completed_at"] is not None
    done = client.get("/api/v1/me/tips", headers=h, params={"completed": "true"}).json()
    assert len(done) == 1 and done[0]["id"] == tid
    pending = client.get("/api/v1/me/tips", headers=h, params={"completed": "false"}).json()
    assert tid not in {t["id"] for t in pending}


def test_reorder_and_delete(client: TestClient, factory, auth_headers) -> None:
    user = _user(factory)
    h = auth_headers(user)
    ids = [client.post("/api/v1/me/tips", headers=h, json={"tip_text": f"t{i}"}).json()["id"] for i in range(3)]
    # reordenar: invertir
    reordered = client.post("/api/v1/me/tips/reorder", headers=h, json=[
        {"id": ids[2], "order_index": 0}, {"id": ids[1], "order_index": 1}, {"id": ids[0], "order_index": 2},
    ])
    assert reordered.status_code == 200
    assert [t["id"] for t in reordered.json()] == [ids[2], ids[1], ids[0]]

    assert client.delete(f"/api/v1/me/tips/{ids[0]}", headers=h).status_code == 204
    assert len(client.get("/api/v1/me/tips", headers=h).json()) == 2


def test_tips_are_user_scoped(client: TestClient, factory, auth_headers) -> None:
    u1 = _user(factory)
    u2 = _user(factory)
    tid = client.post("/api/v1/me/tips", headers=auth_headers(u1), json={"tip_text": "privado"}).json()["id"]
    # u2 no lo ve ni lo puede tocar
    assert client.get("/api/v1/me/tips", headers=auth_headers(u2)).json() == []
    assert client.patch(f"/api/v1/me/tips/{tid}", headers=auth_headers(u2), json={"is_completed": True}).status_code == 404
    assert client.delete(f"/api/v1/me/tips/{tid}", headers=auth_headers(u2)).status_code == 404


def test_tips_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/me/tips").status_code in (401, 403)


def test_ai_summary_disabled_by_flag(client: TestClient, factory, auth_headers) -> None:
    res = client.post("/api/v1/me/plan-accion/ai-summary", headers=auth_headers(_user(factory)))
    assert res.status_code == 200
    assert res.json()["enabled"] is False
    assert res.json()["suggestions"] == []
