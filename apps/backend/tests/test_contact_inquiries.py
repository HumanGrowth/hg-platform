"""Marketing contact inquiries (FE-v2-06): public POST + superadmin GET."""
from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import delete, select

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.marketing.models import ContactInquiry

VALID = {
    "name": "María Pérez",
    "email": "maria@empresa.test",
    "company": "Empresa CR",
    "role": "RRHH",
    "message": "Queremos un piloto para 30 personas.",
    "source": "landing-hero",
}


def _cleanup(emails: list[str]) -> None:
    s = SessionLocal()
    s.execute(delete(ContactInquiry).where(ContactInquiry.email.in_(emails)))
    s.commit()
    s.close()


# ─────────────────────────── public POST ───────────────────────────


def test_submit_inquiry_public_no_auth(client: TestClient) -> None:
    try:
        res = client.post("/api/v1/contact/inquiry", json=VALID)
        assert res.status_code == 201, res.text
        assert res.json() == {"ok": True}

        s = SessionLocal()
        row = s.scalar(select(ContactInquiry).where(ContactInquiry.email == VALID["email"]))
        assert row is not None
        assert row.name == VALID["name"]
        assert row.company == "Empresa CR"
        assert row.source == "landing-hero"
        assert row.contacted_at is None
        s.close()
    finally:
        _cleanup([VALID["email"]])


def test_submit_inquiry_minimal_fields(client: TestClient) -> None:
    payload = {"name": "Solo Nombre", "email": "solo@x.test"}
    try:
        res = client.post("/api/v1/contact/inquiry", json=payload)
        assert res.status_code == 201, res.text
    finally:
        _cleanup([payload["email"]])


def test_submit_inquiry_rejects_bad_email(client: TestClient) -> None:
    res = client.post("/api/v1/contact/inquiry", json={"name": "X", "email": "no-at-sign"})
    assert res.status_code == 422


def test_submit_inquiry_requires_name(client: TestClient) -> None:
    res = client.post("/api/v1/contact/inquiry", json={"email": "x@y.test"})
    assert res.status_code == 422


# ─────────────────────────── admin GET ───────────────────────────


def test_list_inquiries_superadmin(client: TestClient, factory, auth_headers) -> None:
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    emails = [f"lead{i}@list.test" for i in range(3)]
    try:
        for e in emails:
            client.post("/api/v1/contact/inquiry", json={"name": "Lead", "email": e})

        res = client.get("/api/v1/admin/contact/inquiries", headers=auth_headers(sa))
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["total"] >= 3
        returned = {item["email"] for item in body["items"]}
        assert set(emails).issubset(returned) or body["total"] > len(body["items"])
    finally:
        _cleanup(emails)


def test_list_inquiries_collaborator_forbidden(client: TestClient, factory, auth_headers) -> None:
    collab = factory.make_user(org=factory.make_org(), role=UserRole.collaborator)
    res = client.get("/api/v1/admin/contact/inquiries", headers=auth_headers(collab))
    assert res.status_code == 403


def test_list_inquiries_requires_auth(client: TestClient) -> None:
    res = client.get("/api/v1/admin/contact/inquiries")
    assert res.status_code in (401, 403)
