"""LC-04: enforcement único del ciclo de vida de la Empresa (ADR-0016)."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.routing import APIRoute
from fastapi.testclient import TestClient
from sqlalchemy import update

from hg.core.auth_middleware import get_current_user
from hg.core.security import generate_opaque_token
from hg.main import app
from hg.modules.company.access import assert_company_allows
from hg.modules.company.grace_policy import (
    API_PREFIX,
    GRACE_ALLOW,
    GRACE_DENY_REVIEWED,
)
from hg.modules.company.lifecycle import transition_company
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Company, UserRole

PASSWORD = "Passw0rd!!"


# ───────────────────────── política (unitario) ─────────────────────────


def _auth_routes() -> set[tuple[str, str]]:
    def walk(dep, seen):
        for d in dep.dependencies:
            seen.add(d.call)
            walk(d, seen)

    out: set[tuple[str, str]] = set()
    for r in app.routes:
        if isinstance(r, APIRoute):
            seen: set = set()
            walk(r.dependant, seen)
            if get_current_user in seen:
                out |= {(m, r.path.removeprefix(API_PREFIX)) for m in r.methods - {"HEAD", "OPTIONS"}}
    return out


def test_grace_policy_covers_all_routes() -> None:
    """Falla si aparece una ruta autenticada nueva sin clasificar (allow o deny)."""
    routes = _auth_routes()
    classified = GRACE_ALLOW | GRACE_DENY_REVIEWED
    assert not (GRACE_ALLOW & GRACE_DENY_REVIEWED), "una ruta no puede estar en ambas tablas"
    assert routes - classified == set(), "rutas autenticadas sin clasificar en grace_policy"
    assert GRACE_DENY_REVIEWED - routes == set(), "deny con rutas que ya no existen"
    registered = {(m, r.path.removeprefix(API_PREFIX)) for r in app.routes if isinstance(r, APIRoute)
                  for m in r.methods - {"HEAD", "OPTIONS"}}
    assert GRACE_ALLOW - registered == set(), "allow con rutas que ya no existen"


def test_grace_allow_has_no_content_or_writes() -> None:
    """Salvaguarda: en gracia solo GET, salvo sesión y soporte."""
    non_get = {r for r in GRACE_ALLOW if r[0] != "GET"}
    assert all(p.startswith(("/auth/", "/me/support/")) for _, p in non_get)
    for _, p in GRACE_ALLOW:
        assert not p.startswith(("/modulos", "/assessment/sessions", "/paths"))


def _co(status: str, **kw) -> SimpleNamespace:
    return SimpleNamespace(status=status, grace_ends_at=kw.get("grace_ends_at"))


def _u(role=UserRole.collaborator) -> SimpleNamespace:
    return SimpleNamespace(role=role)


@pytest.mark.parametrize("st", ["trial", "active"])
def test_trial_active_allow_everything(st: str) -> None:
    assert_company_allows("POST", "/modulos/{slug}/attempts/start", _u(), _co(st))


def test_grace_allowlist_deny_by_default() -> None:
    co = _co("grace", grace_ends_at=datetime.now(UTC) + timedelta(days=5))
    assert_company_allows("GET", "/me/home", _u(), co)
    assert_company_allows("GET", "/api/v1/me/home", _u(), co)  # con prefijo también
    for method, path in [("POST", "/me/tips"), ("GET", "/modulos/feed"), ("GET", "/ruta/inventada")]:
        with pytest.raises(HTTPException) as e:
            assert_company_allows(method, path, _u(), co)
        assert e.value.status_code == 403
        assert e.value.detail["code"] == "company_read_only"
        assert e.value.detail["grace_ends_at"] == co.grace_ends_at.isoformat()


def test_expired_grace_is_suspended() -> None:
    co = _co("grace", grace_ends_at=datetime.now(UTC) - timedelta(seconds=1))
    with pytest.raises(HTTPException) as e:
        assert_company_allows("GET", "/me/home", _u(), co)
    assert e.value.detail["code"] == "company_suspended"


@pytest.mark.parametrize(("st", "code"), [("suspended", "company_suspended"), ("terminated", "company_terminated")])
def test_suspended_terminated_block_all_but_logout(st: str, code: str) -> None:
    for method, path in [("GET", "/me/home"), ("GET", "/auth/me"), ("POST", "/auth/refresh")]:
        with pytest.raises(HTTPException) as e:
            assert_company_allows(method, path, _u(), _co(st))
        assert e.value.detail["code"] == code
        assert e.value.detail["grace_ends_at"] is None
    assert_company_allows("POST", "/auth/logout", _u(), _co(st))


@pytest.mark.parametrize("st", ["grace", "suspended", "terminated"])
def test_superadmin_always_allowed(st: str) -> None:
    assert_company_allows("POST", "/admin/orgs", _u(UserRole.superadmin), _co(st))


# ───────────────────────── HTTP (Postgres real) ─────────────────────────


def _set_status(factory, company: Company, to: str, **extra) -> None:
    s = factory.session
    s.execute(update(Company).where(Company.id == company.id).values(status=to, **extra))
    s.commit()


def _login(client: TestClient, user, password: str = PASSWORD):
    return client.post("/api/v1/auth/login", json={"email": user.email, "password": password})


@pytest.fixture
def tenant(factory):
    """Empresa A con collab + admin + company_admin; empresa B con collab."""
    ca = factory.make_company(name="A")
    oa = factory.make_org(company=ca)
    cb = factory.make_company(name="B")
    ob = factory.make_org(company=cb)
    return SimpleNamespace(
        ca=ca, cb=cb, oa=oa, ob=ob,
        collab=factory.make_user(org=oa),
        admin=factory.make_user(org=oa, role=UserRole.admin),
        cadmin=factory.make_user(org=oa, role=UserRole.company_admin),
        other=factory.make_user(org=ob),
    )  # fmt: skip


def test_suspended_cannot_login_or_refresh(client, factory, tenant) -> None:
    ok = _login(client, tenant.collab)
    assert ok.status_code == 200
    refresh = ok.json()["refresh_token"]

    _set_status(factory, tenant.ca, "suspended")

    res = _login(client, tenant.collab)
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "company_suspended"
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "company_suspended"


def test_login_does_not_leak_company_state_to_bad_credentials(client, factory, tenant) -> None:
    _set_status(factory, tenant.ca, "suspended")
    bad = _login(client, tenant.collab, password="mala-clave-123")
    assert bad.status_code == 401
    assert bad.json()["detail"] == "invalid credentials"
    unknown = client.post("/api/v1/auth/login", json={"email": "nadie@hgtest.test", "password": PASSWORD})
    assert unknown.status_code == 401
    assert unknown.json() == bad.json()


def test_token_issued_before_suspension_dies_on_next_request(client, factory, tenant, auth_headers) -> None:
    headers = auth_headers(tenant.collab)
    assert client.get("/api/v1/auth/me", headers=headers).status_code == 200
    _set_status(factory, tenant.ca, "suspended")
    res = client.get("/api/v1/auth/me", headers=headers)
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "company_suspended"


def test_grace_read_progress_ok_content_and_writes_blocked(client, factory, tenant, auth_headers) -> None:
    ends = datetime.now(UTC) + timedelta(days=10)
    _set_status(factory, tenant.ca, "grace", grace_ends_at=ends)
    h = auth_headers(tenant.collab)

    for path in ("/auth/me", "/me/progression", "/me/metrics", "/me/consent"):
        assert client.get(f"/api/v1{path}", headers=h).status_code == 200, path

    blocked = [
        ("GET", "/modulos/feed"),
        ("GET", "/me/path"),
        ("POST", "/assessment/sessions"),
        ("POST", "/me/tips"),
        ("PATCH", "/auth/me"),
    ]
    for method, path in blocked:
        res = client.request(method, f"/api/v1{path}", headers=h, json={})
        assert res.status_code == 403, (method, path, res.text)
        d = res.json()["detail"]
        assert d["code"] == "company_read_only"
        assert d["grace_ends_at"] is not None


def test_grace_refresh_and_login_still_work(client, factory, tenant) -> None:
    _set_status(factory, tenant.ca, "grace", grace_ends_at=datetime.now(UTC) + timedelta(days=10))
    res = _login(client, tenant.collab)
    assert res.status_code == 200
    res = client.post("/api/v1/auth/refresh", json={"refresh_token": res.json()["refresh_token"]})
    assert res.status_code == 200


def test_grace_company_admin_reads_but_cannot_invite(client, factory, tenant, auth_headers) -> None:
    _set_status(factory, tenant.ca, "grace", grace_ends_at=datetime.now(UTC) + timedelta(days=10))
    ch = auth_headers(tenant.cadmin)
    assert client.get("/api/v1/company/members", headers=ch).status_code == 200
    res = client.post("/api/v1/company/invitations/send", headers=ch, json={})
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "company_read_only"
    res = client.post("/api/v1/company/members/bulk-import", headers=ch)
    assert res.status_code == 403


def test_grace_admin_can_export_csv_but_not_mutate_users(client, factory, tenant, auth_headers) -> None:
    _set_status(factory, tenant.ca, "grace", grace_ends_at=datetime.now(UTC) + timedelta(days=10))
    ah = auth_headers(tenant.admin)
    assert client.get("/api/v1/admin/org/users/export.csv", headers=ah).status_code == 200
    res = client.patch(f"/api/v1/admin/users/{tenant.collab.id}", headers=ah, json={"is_active": False})
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "company_read_only"


def test_expired_grace_behaves_as_suspended(client, factory, tenant, auth_headers) -> None:
    _set_status(factory, tenant.ca, "grace", grace_ends_at=datetime.now(UTC) - timedelta(minutes=1))
    res = client.get("/api/v1/me/progression", headers=auth_headers(tenant.collab))
    assert res.status_code == 403
    assert res.json()["detail"]["code"] == "company_suspended"


@pytest.mark.parametrize("st", ["grace", "suspended", "terminated"])
def test_accept_invite_blocked_unless_trial_or_active(client, factory, tenant, st: str) -> None:
    plain, token_hash = generate_opaque_token()
    s = factory.session
    s.add(Invitation(org_id=tenant.oa.id, email="nuevo@hgtest.test", role=UserRole.collaborator,
                     token_hash=token_hash, expires_at=datetime.now(UTC) + timedelta(days=3)))  # fmt: skip
    s.commit()
    _set_status(factory, tenant.ca, st, grace_ends_at=datetime.now(UTC) + timedelta(days=5) if st == "grace" else None)

    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": plain, "password": PASSWORD, "username_or_email": "nuevo@hgtest.test", "accepted_terms": True},
    )
    assert res.status_code == 403, res.text
    assert res.json()["detail"]["code"] == {
        "grace": "company_read_only", "suspended": "company_suspended", "terminated": "company_terminated"
    }[st]  # fmt: skip

    _set_status(factory, tenant.ca, "active")
    res = client.post(
        "/api/v1/auth/accept-invite",
        json={"token": plain, "password": PASSWORD, "username_or_email": "nuevo@hgtest.test", "accepted_terms": True},
    )
    assert res.status_code == 200, res.text


def test_superadmin_of_suspended_company_still_enters(client, factory, tenant, auth_headers) -> None:
    su = factory.make_user(org=tenant.oa, role=UserRole.superadmin)
    _set_status(factory, tenant.ca, "suspended")
    assert _login(client, su).status_code == 200
    assert client.get("/api/v1/auth/me", headers=auth_headers(su)).status_code == 200


def test_suspending_a_does_not_affect_b_and_reactivation_restores(client, factory, tenant, auth_headers) -> None:
    _set_status(factory, tenant.ca, "suspended")
    assert client.get("/api/v1/auth/me", headers=auth_headers(tenant.collab)).status_code == 403
    assert client.get("/api/v1/auth/me", headers=auth_headers(tenant.other)).status_code == 200
    assert _login(client, tenant.other).status_code == 200

    # Reactivar con el servicio (único escritor): restaura el acceso sin tocar usuarios.
    transition_company(factory.session, company_id=tenant.ca.id, to_status="active", actor=None, reason=None)
    factory.session.commit()
    assert client.get("/api/v1/auth/me", headers=auth_headers(tenant.collab)).status_code == 200
    assert _login(client, tenant.collab).status_code == 200
