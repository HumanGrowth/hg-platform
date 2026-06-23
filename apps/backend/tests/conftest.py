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
def manager_with_reports(factory) -> Generator[SimpleNamespace, None, None]:
    """Un manager con 3 reportes: r1 (activo, 5 cursos completados), r2
    (inactivo, 1 curso en progreso hace 10d), r3 (nunca activo). Crea 5 courses
    bajo P1 (limpiados en teardown; el resto cae por CASCADE de la org)."""
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import select

    from hg.modules.learning.models import (
        CareerLevel,
        CareerPath,
        Course,
        CourseProgress,
        CourseTrack,
    )

    s = factory.session
    org = factory.make_org()
    mgr = factory.make_user(org=org, role=UserRole.manager, full_name="Manager One")
    r1 = factory.make_user(org=org, manager_id=mgr.id, full_name="Active Report")
    r2 = factory.make_user(org=org, manager_id=mgr.id, full_name="Inactive Report")
    r3 = factory.make_user(org=org, manager_id=mgr.id, full_name="Never Active")

    # Asegurar P1..P6 (catálogo global).
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

    courses = []
    for i in range(5):
        c = Course(
            career_path_id=p1.id, title=f"MWR Course {i}", slug=f"mwr-{uuid4().hex[:10]}",
            order_index=i, career_level=CareerLevel.L1, track=CourseTrack.competency,
            duration_seconds=300,
        )
        s.add(c)
        courses.append(c)
    s.commit()
    course_ids = [c.id for c in courses]

    now = datetime.now(UTC)
    for c in courses:  # r1: 5 completados, reciente
        s.add(CourseProgress(
            org_id=org.id, user_id=r1.id, course_id=c.id, last_position_seconds=300,
            watch_pct=100.0, is_completed=True, first_played_at=now - timedelta(days=2),
            last_played_at=now - timedelta(days=1), completed_at=now - timedelta(days=1),
        ))
    s.add(CourseProgress(  # r2: 1 en progreso, inactivo (10d)
        org_id=org.id, user_id=r2.id, course_id=courses[0].id, last_position_seconds=120,
        watch_pct=40.0, is_completed=False, first_played_at=now - timedelta(days=10),
        last_played_at=now - timedelta(days=10),
    ))
    s.commit()

    yield SimpleNamespace(org=org, manager=mgr, r1=r1, r2=r2, r3=r3, courses=courses, path=p1)

    s.execute(delete(Course).where(Course.id.in_(course_ids)))  # CASCADE borra su progress
    s.commit()


@pytest.fixture
def auth_headers() -> Callable[[User], dict[str, str]]:
    """Devuelve headers Bearer con un access token recién emitido para un user."""

    def _headers(user: User) -> dict[str, str]:
        token = create_token(
            user_id=user.id, org_id=user.org_id, role=user.role.value, token_type="access"
        )
        return {"Authorization": f"Bearer {token}"}

    return _headers
