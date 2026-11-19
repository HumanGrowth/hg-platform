"""LC-05: endpoints de superadmin del ciclo de vida + estado en /auth/me (ADR-0016)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import select, update

from hg.modules.company.models import CompanyLifecycleEvent
from hg.modules.identity.models import Company, UserRole


@pytest.fixture
def env(factory):
    home = factory.make_company(name="HG Home")
    ho = factory.make_org(company=home)
    target = factory.make_company(name="Cliente", status="trial")
    to = factory.make_org(company=target)
    return SimpleNamespace(
        target=target,
        su=factory.make_user(org=ho, role=UserRole.superadmin),
        cadmin=factory.make_user(org=to, role=UserRole.company_admin),
        admin=factory.make_user(org=to, role=UserRole.admin),
        collab=factory.make_user(org=to),
    )


def _make_active(factory, env) -> None:
    factory.session.execute(update(Company).where(Company.id == env.target.id).values(status="active"))
    factory.session.commit()


def _post(client, env, auth_headers, body, who=None):
    return client.post(
        f"/api/v1/admin/companies/{env.target.id}/status",
        headers=auth_headers(who or env.su),
        json=body,
    )


@pytest.mark.parametrize("who", ["cadmin", "admin", "collab"])
def test_only_superadmin_can_change_status_or_read_events(client, env, auth_headers, who) -> None:
    user = getattr(env, who)
    assert _post(client, env, auth_headers, {"to_status": "grace"}, who=user).status_code == 403
    res = client.get(f"/api/v1/admin/companies/{env.target.id}/events", headers=auth_headers(user))
    assert res.status_code == 403


def test_dry_run_previews_without_writing(client, factory, env, auth_headers) -> None:
    res = _post(client, env, auth_headers, {"to_status": "grace", "dry_run": True})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["applied"] is False
    p = body["preview"]
    assert (p["from_status"], p["to_status"]) == ("trial", "grace")
    assert p["active_users_total"] == 3
    assert p["active_users_by_role"] == {"collaborator": 1, "admin": 1, "company_admin": 1}
    assert p["admins"] == 2
    assert p["grace_ends_at"] is not None
    assert body["company"]["status"] == "trial"
    factory.session.expire_all()
    assert factory.session.get(Company, env.target.id).status == "trial"
    n = factory.session.scalar(
        select(CompanyLifecycleEvent.id).where(CompanyLifecycleEvent.company_id == env.target.id)
    )
    assert n is None


def test_apply_grace_then_history(client, factory, env, auth_headers) -> None:
    res = _post(client, env, auth_headers, {"to_status": "grace"})
    assert res.status_code == 200, res.text
    c = res.json()["company"]
    assert res.json()["applied"] is True
    assert c["status"] == "grace"
    assert c["grace_days"] == 30
    assert c["grace_ends_at"] is not None

    ev = client.get(f"/api/v1/admin/companies/{env.target.id}/events", headers=auth_headers(env.su))
    assert ev.status_code == 200
    page = ev.json()
    assert page["total"] == 1
    e = page["items"][0]
    assert (e["event_type"], e["from_status"], e["to_status"]) == ("status_change", "trial", "grace")
    assert e["actor_user_id"] == str(env.su.id)
    assert e["actor_name"] == env.su.full_name


def test_suspend_requires_reason_and_confirm_slug(client, factory, env, auth_headers) -> None:
    _make_active(factory, env)
    res = _post(client, env, auth_headers, {"to_status": "suspended", "reason": "impago"})
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "confirm_slug_mismatch"
    res = _post(client, env, auth_headers, {"to_status": "suspended", "reason": "impago", "confirm_slug": "otro"})
    assert res.status_code == 422

    res = _post(client, env, auth_headers, {"to_status": "suspended", "confirm_slug": env.target.slug})
    assert res.status_code == 422
    assert res.json()["detail"]["code"] == "reason_required"

    res = _post(
        client, env, auth_headers,
        {"to_status": "suspended", "reason": "impago", "confirm_slug": env.target.slug},
    )  # fmt: skip
    assert res.status_code == 200, res.text
    assert res.json()["company"]["status"] == "suspended"
    # No tocó a los usuarios.
    factory.session.expire_all()
    from hg.modules.identity.models import User

    assert factory.session.get(User, env.collab.id).is_active is True


def test_dry_run_of_suspend_needs_no_confirm_slug(client, factory, env, auth_headers) -> None:
    _make_active(factory, env)
    res = _post(client, env, auth_headers, {"to_status": "suspended", "dry_run": True, "reason": "x"})
    assert res.status_code == 200
    assert res.json()["applied"] is False


def test_invalid_transition_409_and_unknown_status_422(client, env, auth_headers) -> None:
    res = _post(client, env, auth_headers, {"to_status": "terminated", "reason": "x", "confirm_slug": env.target.slug})
    assert res.status_code == 409
    assert res.json()["detail"]["code"] == "invalid_transition"
    assert _post(client, env, auth_headers, {"to_status": "bogus"}).status_code == 422


def test_unknown_company_404(client, env, auth_headers) -> None:
    from uuid import uuid4

    res = client.post(
        f"/api/v1/admin/companies/{uuid4()}/status", headers=auth_headers(env.su), json={"to_status": "grace"}
    )
    assert res.status_code == 404


def test_events_pagination_newest_first(client, factory, env, auth_headers) -> None:
    for to in ("grace", "active", "grace"):
        assert _post(client, env, auth_headers, {"to_status": to}).status_code == 200
    url = f"/api/v1/admin/companies/{env.target.id}/events"
    page = client.get(url, headers=auth_headers(env.su), params={"limit": 2}).json()
    assert page["total"] == 3
    assert [e["to_status"] for e in page["items"]] == ["grace", "active"]
    page2 = client.get(url, headers=auth_headers(env.su), params={"limit": 2, "offset": 2}).json()
    assert [e["to_status"] for e in page2["items"]] == ["grace"]


def test_company_listing_exposes_lifecycle_fields(client, env, auth_headers) -> None:
    res = client.get("/api/v1/admin/companies", headers=auth_headers(env.su))
    row = next(c for c in res.json() if c["id"] == str(env.target.id))
    assert row["status"] == "trial"
    assert row["grace_days"] == 30
    assert "status_changed_at" in row
    assert row["grace_ends_at"] is None


def test_created_company_starts_in_trial(client, factory, env, auth_headers) -> None:
    res = client.post(
        "/api/v1/admin/companies",
        headers=auth_headers(env.su),
        json={"name": "Nueva", "slug": f"nueva-{env.target.slug}", "licenses_total": 5},
    )
    assert res.status_code == 201, res.text
    assert res.json()["status"] == "trial"
    factory.session.execute(
        update(Company).where(Company.id == res.json()["id"]).values(status="active")
    )
    from sqlalchemy import delete

    factory.session.execute(delete(Company).where(Company.id == res.json()["id"]))
    factory.session.commit()


def test_me_exposes_company_status_and_grace(client, factory, env, auth_headers) -> None:
    h = auth_headers(env.collab)
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["company_status"] == "trial"
    assert me["grace_ends_at"] is None

    ends = datetime.now(UTC) + timedelta(days=7)
    factory.session.execute(
        update(Company).where(Company.id == env.target.id).values(status="grace", grace_ends_at=ends)
    )
    factory.session.commit()
    me = client.get("/api/v1/auth/me", headers=h).json()
    assert me["company_status"] == "grace"
    assert datetime.fromisoformat(me["grace_ends_at"]) == ends

    factory.session.execute(
        update(Company).where(Company.id == env.target.id).values(grace_ends_at=datetime.now(UTC) - timedelta(minutes=1))
    )
    factory.session.commit()
    # Gracia vencida => 403 company_suspended (enforcement), pero superadmin ve el estado efectivo.
    assert client.get("/api/v1/auth/me", headers=h).status_code == 403
