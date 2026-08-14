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


@pytest.fixture(scope="session", autouse=True)
def _seed_assessment_catalog() -> None:
    """Asegura el catálogo de assessment (9 instrumentos + 57 items) en la DB.

    Global (sin RLS) e idempotente; necesario para los tests del motor de
    assessment y para la DB limpia de CI."""
    from hg.scripts.seed_assessment import seed

    s = SessionLocal()
    try:
        seed(s)
    finally:
        s.close()


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
    from hg.modules.identity.models import Company

    s = SessionLocal()
    created_company_ids: list = []

    def make_company(*, name: str = "Test Company", licenses_total: int = 1000, **kw) -> Company:
        company = Company(name=name, slug=f"c-{uuid4().hex[:10]}", licenses_total=licenses_total, **kw)
        s.add(company)
        s.commit()
        created_company_ids.append(company.id)
        return company

    def make_org(*, slug: str | None = None, name: str = "Test Org",
                 licenses_total: int | None = 50, company: Company | None = None,
                 **kw) -> Organization:
        # CE-06: la org no lleva licencias; el pool vive en la Company. Si no se
        # pasa una Company, se crea una envoltura 1:1 con `licenses_total` de pool.
        if company is None:
            company = make_company(name=name, licenses_total=licenses_total or 1000)
        org = Organization(
            name=name, slug=slug or f"t-{uuid4().hex[:10]}", company_id=company.id, **kw
        )
        s.add(org)
        s.commit()
        return org

    def make_user(*, org: Organization, role: UserRole = UserRole.collaborator,
                  password: str = "Passw0rd!!", email: str | None = None,
                  full_name: str = "Test User", **kw) -> User:
        user = User(
            org_id=org.id,
            company_id=org.company_id,
            email=email or f"u-{uuid4().hex[:10]}@hgtest.test",
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            **kw,
        )
        s.add(user)
        # CE-06: el uso del pool se computa por users activos, no hay contador.
        s.commit()
        return user

    yield SimpleNamespace(
        make_company=make_company, make_org=make_org, make_user=make_user, session=s
    )

    # Borrar por Company: CASCADE elimina orgs → users → sessions / invitations.
    for cid in created_company_ids:
        s.execute(delete(Company).where(Company.id == cid))
    s.commit()
    s.close()


@pytest.fixture
def manager_with_reports(factory) -> Generator[SimpleNamespace, None, None]:
    """Un manager con 3 reportes: r1 (activo, 5 módulos completados), r2
    (inactivo, 1 módulo en progreso hace 10d), r3 (nunca activo). Crea 5 units
    CP (→P1) globales, limpiadas en teardown."""
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from hg.modules.learning.models import CareerPath

    from ._lu_helpers import cleanup_units, make_unit, seed_attempt

    s = factory.session
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager, full_name="Manager One")
    r1 = factory.make_user(org=org, manager_id=mgr.id, full_name="Active Report")
    r2 = factory.make_user(org=org, manager_id=mgr.id, full_name="Inactive Report")
    r3 = factory.make_user(org=org, manager_id=mgr.id, full_name="Never Active")

    # Asegurar P1..P6 (catálogo global) para el mapeo dimensión→career_path.
    paths_def = [
        ("P1", "Carrera e impacto", 1), ("P2", "Propósito y significado", 2),
        ("P3", "Relaciones y conexión", 3), ("P4", "Salud y bienestar", 4),
        ("P5", "Paz interior y claridad", 5), ("P6", "Estabilidad emocional y material", 6),
    ]
    for code, name, order in paths_def:
        if not s.scalar(select(CareerPath).where(CareerPath.code == code)):
            s.add(CareerPath(code=code, name=name, order_index=order))
    s.commit()
    p1 = s.scalar(select(CareerPath).where(CareerPath.code == "P1"))

    units = [make_unit(s, dimension_code="CP") for _ in range(5)]
    unit_ids = [u.id for u in units]

    now = datetime.now(UTC)
    for u in units:  # r1: 5 módulos completados, reciente
        seed_attempt(
            s, org_id=org.id, user_id=r1.id, unit=u,
            when=now - timedelta(days=1), completed=True,
        )
    seed_attempt(  # r2: 1 en progreso, inactivo (10d)
        s, org_id=org.id, user_id=r2.id, unit=units[0],
        when=now - timedelta(days=10), completed=False,
    )

    yield SimpleNamespace(org=org, manager=mgr, r1=r1, r2=r2, r3=r3, units=units, path=p1)

    cleanup_units(s, unit_ids)


@pytest.fixture
def auth_headers() -> Callable[[User], dict[str, str]]:
    """Devuelve headers Bearer con un access token recién emitido para un user."""

    def _headers(user: User) -> dict[str, str]:
        token = create_token(
            user_id=user.id, org_id=user.org_id, role=user.role.value, token_type="access"
        )
        return {"Authorization": f"Bearer {token}"}

    return _headers
