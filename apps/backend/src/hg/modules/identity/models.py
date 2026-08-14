"""Identity models: Organization, User and UserSession (Capa 1 — DEV-03)."""
from __future__ import annotations

import enum
import uuid
from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from hg.db import Base


class UserRole(str, enum.Enum):
    superadmin = "superadmin"
    company_admin = "company_admin"  # RRHH: ve toda su Empresa (TASK 1/2)
    admin = "admin"
    manager = "manager"
    collaborator = "collaborator"


class OrgTier(str, enum.Enum):
    A = "A"
    B = "B"
    C = "C"


class Company(Base):
    """Empresa: raíz jerárquica por encima de Organization (Capa Empresa · TASK 1).

    Gobernada por superadmin HG (crea la Empresa y asigna el pool de licencias).
    Sin ``org_id`` y **sin RLS** — mismo criterio que ``organizations`` (raíz de
    tenant). ``licenses_total`` es el pool de la Empresa; ``licenses_used`` NO se
    almacena: se computa como la suma de users activos de todas sus orgs (TASK 3).
    """

    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    tier: Mapped[OrgTier] = mapped_column(
        Enum(OrgTier, name="org_tier", create_type=False), nullable=False, default=OrgTier.C
    )
    billing_status: Mapped[str] = mapped_column(String(50), nullable=False, default="trial")
    billing_cycle: Mapped[str | None] = mapped_column(String(20))  # monthly | annual
    contract_start: Mapped[date | None] = mapped_column(Date)
    contract_end: Mapped[date | None] = mapped_column(Date)
    # Pool de licencias de la Empresa (lo asigna superadmin HG).
    licenses_total: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organizations: Mapped[list[Organization]] = relationship(
        "Organization", back_populates="company", lazy="raise"
    )


class CareerLevel(str, enum.Enum):
    L1 = "L1"
    L2 = "L2"
    L3 = "L3"
    L4a = "L4a"
    L4b = "L4b"


class Organization(Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # Empresa a la que pertenece (Capa Empresa · TASK 1). NOT NULL tras la
    # migración CE-01 (cada org existente se envolvió en una Company 1:1).
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    country: Mapped[str | None] = mapped_column(String(2))  # ISO 3166-1 alpha-2
    # NOTA (CE-06): billing/contrato/tier y el modelo de licencias por-org se
    # movieron a Company (la entidad comercial). La Organization es solo la unidad
    # operativa; el límite de licencias es el pool de la Empresa (computado).
    settings: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    logo_url: Mapped[str | None] = mapped_column(String(2048))
    primary_color: Mapped[str | None] = mapped_column(String(7))  # hex e.g. #3B82F6
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    company: Mapped[Company] = relationship("Company", back_populates="organizations", lazy="raise")
    users: Mapped[list[User]] = relationship("User", back_populates="organization", lazy="raise")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("org_id", "email", name="uq_users_org_email"),
        UniqueConstraint("org_id", "username", name="uq_users_org_username"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Empresa del user (denormalizado = organizations.company_id) para el scope
    # del company_admin sin join por org. NOT NULL tras CE-01. Capa Empresa · TASK 1.
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    email: Mapped[str] = mapped_column(String(254), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Release TASK 3.4: username opcional (único por org). NULL para users que se
    # registraron con email. Postgres trata los NULL como distintos → múltiples OK.
    username: Mapped[str | None] = mapped_column(String(30))
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.collaborator
    )
    career_level: Mapped[CareerLevel | None] = mapped_column(
        Enum(CareerLevel, name="career_level")
    )
    job_title: Mapped[str | None] = mapped_column(String(255))
    department: Mapped[str | None] = mapped_column(String(255))
    hire_date: Mapped[date | None] = mapped_column(Date)
    manager_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Tour de features post-primer-login (Release TASK 6). False = mostrar el tour.
    has_seen_onboarding: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_active_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    organization: Mapped[Organization] = relationship("Organization", back_populates="users", lazy="raise")
    manager: Mapped[User | None] = relationship(
        "User", remote_side="User.id", lazy="raise", overlaps="reports"
    )
    reports: Mapped[list[User]] = relationship(
        "User", foreign_keys=[manager_id], lazy="raise", overlaps="manager"
    )


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    refresh_token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True, unique=True)
    device_info: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    ip_address: Mapped[str | None] = mapped_column(String(45))  # IPv6 max
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
