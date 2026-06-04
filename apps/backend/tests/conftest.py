"""Shared pytest fixtures."""
from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from hg.db import engine
from hg.main import app


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
