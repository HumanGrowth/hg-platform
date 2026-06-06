"""Shared pytest fixtures."""
from __future__ import annotations

from collections.abc import Callable, Generator
from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import delete
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from hg.core.security import create_token, hash_password
from hg.db import SessionLocal, engine
from hg.main import app
from hg.modules.identity.models import Organization, User, UserRole


@pytest.fixture(scope="session")
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def db() -> Generator[Session, None, None]:
    """Transactional session with rollback-per-test isolation.

    Opens a single connection + outer transaction, binds an ORM Session to
    it, and rolls everything back on teardown so tests never persist data.
    The outer transaction also gives ``SET LOCAL`` / RLS the transaction
    they require to take effect.

    Connects as the default role (``hg``), which is a superuser in the dev
    container and therefore BYPASSes RLS — convenient for bootstrapping
    fixture rows. Tests that need RLS *enforced* switch with
    ``SET LOCAL ROLE hg_app`` (see ``test_rls.py``).
    """
    connection: Connection = engine.connect()
    trans = connection.begin()
    # create_savepoint: la sesión opera dentro de un SAVEPOINT, de modo que
    # un rollback interno (p.ej. tras un IntegrityError esperado) no destruye
    # la transacción externa que controla el aislamiento del test.
    session = Session(
        bind=connection,
        expire_on_commit=False,
        join_transaction_mode="create_savepoint",
    )
    try:
        yield session
    finally:
        session.close()
        trans.rollback()
        connection.close()


@pytest.fixture
def factory() -> Generator[SimpleNamespace, None, None]:
    """Crea orgs/users COMMITEADOS para tests de endpoints HTTP.

    Los flujos de auth usan conexiones independientes (``get_db`` vs
    ``get_db_as_superadmin``), por lo que los datos deben estar commiteados
    para ser visibles entre conexiones — igual que en producción. Para no
    contaminar la DB, se borran al final las orgs creadas (CASCADE elimina
    users / sessions / invitations). Slugs/emails únicos evitan colisiones
    con el seed existente.
    """
    s = SessionLocal()
    created_org_ids: list = []

    def make_org(*, slug: str | None = None, name: str = "Test Org", licenses_total: int = 50,
                 **kw) -> Organization:
        org = Organization(
            name=name, slug=slug or f"t-{uuid4().hex[:10]}", licenses_total=licenses_total, **kw
        )
        s.add(org)
        s.commit()
        created_org_ids.append(org.id)
        return org

    def make_user(*, org: Organization, role: UserRole = UserRole.collaborator,
                  password: str = "Passw0rd!!", email: str | None = None,
                  full_name: str = "Test User", **kw) -> User:
        user = User(
            org_id=org.id,
            email=email or f"u-{uuid4().hex[:10]}@hgtest.test",
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            **kw,
        )
        s.add(user)
        org.licenses_used += 1
        s.commit()
        return user

    yield SimpleNamespace(make_org=make_org, make_user=make_user, session=s)

    for oid in created_org_ids:
        s.execute(delete(Organization).where(Organization.id == oid))
    s.commit()
    s.close()


@pytest.fixture
def auth_headers() -> Callable[[User], dict[str, str]]:
    """Devuelve headers Bearer con un access token recién emitido para un user."""

    def _headers(user: User) -> dict[str, str]:
        token = create_token(
            user_id=user.id, org_id=user.org_id, role=user.role.value, token_type="access"
        )
        return {"Authorization": f"Bearer {token}"}

    return _headers
