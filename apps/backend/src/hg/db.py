"""Database engine, session factory and Base model."""
from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from hg.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    echo=False,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency that yields a transactional session.

    Abre una transacción explícita (``BEGIN``) antes de ceder la sesión:
    las políticas RLS y ``SET LOCAL app.current_org_id`` requieren estar
    dentro de una transacción para tener efecto y auto-limpiarse al
    commit/rollback.
    """
    db = SessionLocal()
    try:
        db.begin()  # asegura transacción abierta para SET LOCAL
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
