"""Perspectivas CMS — público + admin CRUD + gate (cierre-beta TASK 1-CMS)."""
from __future__ import annotations

import uuid

from fastapi.testclient import TestClient
from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.perspectives.models import PerspectivePost


def _sa(factory, auth_headers):
    return auth_headers(factory.make_user(org=factory.make_org(), role=UserRole.superadmin))


def _cleanup(post_id: str) -> None:
    s = SessionLocal()
    s.execute(delete(PerspectivePost).where(PerspectivePost.id == uuid.UUID(post_id)))
    s.commit()
    s.close()


def test_create_draft_then_publish_flow(client: TestClient, factory, auth_headers) -> None:
    h = _sa(factory, auth_headers)
    created = client.post("/api/v1/admin/perspectives", headers=h, json={
        "content_type": "article", "title": "Liderazgo en LatAm", "body_markdown": "# Hola",
        "read_minutes_estimated": 7, "dimension_code": "P1", "tags": ["liderazgo"],
    })
    assert created.status_code == 201, created.text
    pid = created.json()["id"]
    slug = created.json()["slug"]
    assert slug == "liderazgo-en-latam"
    assert created.json()["article"]["read_minutes_estimated"] == 7
    try:
        # draft → no aparece en el público
        pub = client.get("/api/v1/perspectives")
        assert slug not in {i["slug"] for i in pub.json()["items"]}
        assert client.get(f"/api/v1/perspectives/{slug}").status_code == 404

        # publicar → aparece
        assert client.post(f"/api/v1/admin/perspectives/{pid}/publish", headers=h).status_code == 200
        pub2 = client.get("/api/v1/perspectives", params={"content_type": "article"})
        assert slug in {i["slug"] for i in pub2.json()["items"]}
        detail = client.get(f"/api/v1/perspectives/{slug}")
        assert detail.status_code == 200
        assert detail.json()["read_minutes_estimated"] == 7

        # búsqueda
        found = client.get("/api/v1/perspectives", params={"q": "latam"})
        assert slug in {i["slug"] for i in found.json()["items"]}

        # unpublish → vuelve a desaparecer
        assert client.post(f"/api/v1/admin/perspectives/{pid}/unpublish", headers=h).status_code == 200
        assert client.get(f"/api/v1/perspectives/{slug}").status_code == 404
    finally:
        _cleanup(pid)


def test_update_and_delete(client: TestClient, factory, auth_headers) -> None:
    h = _sa(factory, auth_headers)
    pid = client.post("/api/v1/admin/perspectives", headers=h, json={
        "content_type": "blog", "title": "Borrador",
    }).json()["id"]
    try:
        patched = client.patch(f"/api/v1/admin/perspectives/{pid}", headers=h, json={
            "title": "Título nuevo", "subtitle": "bajada",
        })
        assert patched.status_code == 200
        assert patched.json()["title"] == "Título nuevo"
        assert patched.json()["subtitle"] == "bajada"

        assert client.delete(f"/api/v1/admin/perspectives/{pid}", headers=h).status_code == 204
        assert client.get(f"/api/v1/admin/perspectives/{pid}", headers=h).status_code == 404
    finally:
        _cleanup(pid)


def test_slug_uniqueness(client: TestClient, factory, auth_headers) -> None:
    h = _sa(factory, auth_headers)
    a = client.post("/api/v1/admin/perspectives", headers=h, json={"content_type": "blog", "title": "Repetido"}).json()
    b = client.post("/api/v1/admin/perspectives", headers=h, json={"content_type": "blog", "title": "Repetido"}).json()
    try:
        assert a["slug"] == "repetido"
        assert b["slug"] == "repetido-2"
    finally:
        _cleanup(a["id"])
        _cleanup(b["id"])


def test_business_case_flow_with_publish_validation(client: TestClient, factory, auth_headers) -> None:
    h = _sa(factory, auth_headers)
    p = client.post("/api/v1/admin/perspectives", headers=h, json={
        "content_type": "business_case", "title": "Caso ACME", "industry": "Retail",
    }).json()
    pid = p["id"]
    try:
        # sin challenge/solution → no publica
        assert client.post(f"/api/v1/admin/perspectives/{pid}/publish", headers=h).status_code == 422
        client.patch(f"/api/v1/admin/perspectives/{pid}", headers=h, json={
            "challenge": "Rotación alta", "solution": "Programa de desarrollo",
            "metrics": [{"label": "Retención", "value": "+12%"}],
        })
        assert client.post(f"/api/v1/admin/perspectives/{pid}/publish", headers=h).status_code == 200
        detail = client.get(f"/api/v1/perspectives/{p['slug']}")
        assert detail.status_code == 200
        assert detail.json()["business_case"]["challenge"] == "Rotación alta"
        assert detail.json()["business_case"]["metrics"][0]["label"] == "Retención"
    finally:
        _cleanup(pid)


def test_whitepaper_flow_with_publish_validation(client: TestClient, factory, auth_headers) -> None:
    h = _sa(factory, auth_headers)
    p = client.post("/api/v1/admin/perspectives", headers=h, json={
        "content_type": "whitepaper", "title": "WP 2026", "abstract": "resumen",
    }).json()
    pid = p["id"]
    try:
        assert client.post(f"/api/v1/admin/perspectives/{pid}/publish", headers=h).status_code == 422
        client.patch(f"/api/v1/admin/perspectives/{pid}", headers=h, json={
            "pdf_url": "https://cdn.humangrowth.io/wp/2026.pdf",
        })
        assert client.post(f"/api/v1/admin/perspectives/{pid}/publish", headers=h).status_code == 200
        detail = client.get(f"/api/v1/perspectives/{p['slug']}")
        assert detail.json()["whitepaper"]["pdf_url"].endswith(".pdf")
    finally:
        _cleanup(pid)


def test_admin_requires_superadmin(client: TestClient, factory, auth_headers) -> None:
    collab = auth_headers(factory.make_user(org=factory.make_org(), role=UserRole.collaborator))
    assert client.post("/api/v1/admin/perspectives", headers=collab, json={
        "content_type": "blog", "title": "x",
    }).status_code == 403
    assert client.get("/api/v1/admin/perspectives", headers=collab).status_code == 403


def test_public_list_needs_no_auth(client: TestClient) -> None:
    assert client.get("/api/v1/perspectives").status_code == 200
