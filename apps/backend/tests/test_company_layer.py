"""Capa Empresa · TASK 1: Company + company_id + backward-compat de licencias."""
from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from hg.modules.identity.models import Company, Organization, UserRole
from hg.modules.identity.service import _org_cap_reached


def test_factory_org_and_users_have_company(factory) -> None:
    """La org vive bajo una Company y el user hereda su company_id (denormalizado)."""
    org = factory.make_org()
    u = factory.make_user(org=org)
    assert org.company_id is not None
    assert u.company_id == org.company_id


def test_create_org_endpoint_wraps_in_company(client: TestClient, factory, auth_headers) -> None:
    """POST /admin/orgs envuelve la org en una Company 1:1: el licenses_total pasado
    va al pool de la Company y el cap de la org queda en NULL (consume del pool)."""
    sa = factory.make_user(org=factory.make_org(), role=UserRole.superadmin)
    slug = f"co-{uuid4().hex[:8]}"
    res = client.post(
        "/api/v1/admin/orgs",
        headers=auth_headers(sa),
        json={"name": "Nueva SA", "slug": slug, "tier": "B", "licenses_total": 20},
    )
    assert res.status_code == 201, res.text

    s = factory.session
    s.expire_all()
    org = s.execute(select(Organization).where(Organization.slug == slug)).scalar_one()
    assert org.company_id is not None
    assert org.licenses_total is None  # cap de la org en NULL
    company = s.get(Company, org.company_id)
    assert company is not None
    assert company.licenses_total == 20  # el pool fue a la Company


def test_org_null_cap_does_not_block() -> None:
    """Backward-compat CE-01: una org con cap NULL (consume del pool) no bloquea
    por cap propio; el chequeo del pool de la Empresa es TASK 3. Unit puro sobre
    objetos en memoria (sin DB)."""
    assert _org_cap_reached(Organization(licenses_total=1, licenses_used=5)) is True
    assert _org_cap_reached(Organization(licenses_total=5, licenses_used=5)) is True
    assert _org_cap_reached(Organization(licenses_total=5, licenses_used=0)) is False
    # cap NULL → nunca bloquea, sin importar el uso.
    assert _org_cap_reached(Organization(licenses_total=None, licenses_used=9999)) is False
