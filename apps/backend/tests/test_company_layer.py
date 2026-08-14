"""Capa Empresa · TASK 1 + CE-06: Company + company_id; billing/licencias en Company."""
from __future__ import annotations

from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from hg.modules.identity.models import Company, Organization, UserRole


def test_factory_org_and_users_have_company(factory) -> None:
    """La org vive bajo una Company y el user hereda su company_id (denormalizado)."""
    org = factory.make_org()
    u = factory.make_user(org=org)
    assert org.company_id is not None
    assert u.company_id == org.company_id


def test_create_org_endpoint_wraps_in_company(client: TestClient, factory, auth_headers) -> None:
    """POST /admin/orgs envuelve la org en una Company 1:1: el licenses_total pasado
    va al pool de la Company (CE-06: la org ya no lleva licencias ni billing)."""
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
    company = s.get(Company, org.company_id)
    assert company is not None
    assert company.licenses_total == 20  # el pool fue a la Company
    assert company.tier.value == "B"     # tier también vive en la Company
