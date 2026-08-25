"""Lógica de la Capa Empresa (TASK 2).

Todos los endpoints corren bajo ``hg_superadmin`` (BYPASSRLS) — la frontera de
Empresa se garantiza EN LA APP con un filtro duro ``company_id`` en cada query
(ver ``_require_company_org`` / ``resolve_company_id``). Un ``company_admin`` de
la Empresa A nunca toca datos de la Empresa B.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from hg.modules.company.models import CompanyAreaAccess
from hg.modules.company.schemas import (
    AreaOut,
    CompanyAccessOut,
    CompanyMemberOut,
    CompanyOrgOut,
    CompanyOut,
    CreateAreaRequest,
    CreateCompanyOrgRequest,
    CreateCompanyRequest,
    MemberDimensionStateOut,
    UpdateAreaRequest,
    UpdateMemberRequest,
)
from hg.modules.identity import service as identity_service
from hg.modules.identity.invitations import Invitation
from hg.modules.identity.models import Company, Organization, User, UserRole
from hg.modules.learning_units.models import Area

# ─────────────────────────── Scope de Empresa (frontera en app) ───────────────────────────


def resolve_company_id(actor: User, company_id: UUID | None) -> UUID:
    """Empresa objetivo: la del actor. Un superadmin puede inspeccionar otra
    pasando ``company_id`` (mismo patrón que ``?org_id`` en /admin)."""
    if actor.role == UserRole.superadmin and company_id is not None:
        return company_id
    return actor.company_id


def _get_company(db: Session, company_id: UUID) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="company not found")
    return company


def _require_company_org(db: Session, company_id: UUID, org_id: UUID) -> Organization:
    """La org debe existir Y pertenecer a la Empresa. 404 si no (nunca revela
    orgs de otra Empresa)."""
    org = db.get(Organization, org_id)
    if org is None or org.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="organization not found")
    return org


def _require_company_member(db: Session, company_id: UUID, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if user is None or user.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="member not found")
    return user


# ─────────────────────────── Superadmin: companies ───────────────────────────


def _company_out(db: Session, company: Company) -> CompanyOut:
    org_count = int(
        db.scalar(
            select(func.count()).select_from(Organization).where(
                Organization.company_id == company.id
            )
        )
        or 0
    )
    return CompanyOut(
        id=company.id,
        name=company.name,
        slug=company.slug,
        tier=company.tier,
        billing_status=company.billing_status,
        licenses_total=company.licenses_total,
        licenses_used=identity_service.company_active_users(db, company.id),
        org_count=org_count,
        is_active=company.is_active,
        created_at=company.created_at,
    )


def list_companies(db: Session) -> list[CompanyOut]:
    companies = db.scalars(select(Company).order_by(Company.created_at.desc())).all()
    return [_company_out(db, c) for c in companies]


def get_company_info(db: Session, company_id: UUID) -> CompanyOut:
    """Info + pool de licencias de UNA empresa (para la pantalla Empresa del
    company_admin). Reusa el cómputo de ``licenses_used`` (users activos)."""
    return _company_out(db, _get_company(db, company_id))


def create_company(db: Session, *, data: CreateCompanyRequest) -> CompanyOut:
    company = Company(
        name=data.name, slug=data.slug, tier=data.tier,
        billing_status=data.billing_status, licenses_total=data.licenses_total,
    )
    db.add(company)
    try:
        db.flush()
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="company slug already exists"
        ) from e
    return _company_out(db, company)


# ─────────────────────────── company_admin: orgs ───────────────────────────


def list_company_orgs(db: Session, company_id: UUID) -> list[CompanyOrgOut]:
    _get_company(db, company_id)
    rows = db.execute(
        select(
            Organization,
            func.count(User.id).filter(User.is_active.is_(True)),
        )
        .outerjoin(User, User.org_id == Organization.id)
        .where(Organization.company_id == company_id)
        .group_by(Organization.id)
        .order_by(Organization.name)
    ).all()
    return [
        CompanyOrgOut(
            id=o.id, name=o.name, slug=o.slug, country=o.country,
            user_count=int(count), license_quota=o.license_quota,
        )
        for o, count in rows
    ]


def _quota_assigned(db: Session, company_id: UUID, *, exclude_org_id: UUID | None = None) -> int:
    """Suma de cupos ya asignados a las orgs de la empresa (opcionalmente excluye una)."""
    q = select(func.coalesce(func.sum(Organization.license_quota), 0)).where(
        Organization.company_id == company_id
    )
    if exclude_org_id is not None:
        q = q.where(Organization.id != exclude_org_id)
    return int(db.scalar(q) or 0)


def _assert_quota_fits(
    db: Session, company: Company, new_quota: int, *, exclude_org_id: UUID | None = None
) -> None:
    assigned = _quota_assigned(db, company.id, exclude_org_id=exclude_org_id)
    if assigned + new_quota > company.licenses_total:
        available = max(company.licenses_total - assigned, 0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"El cupo excede el pool de la empresa. Disponible: {available} "
                f"de {company.licenses_total} licencias."
            ),
        )


def create_org_in_company(
    db: Session, *, company_id: UUID, data: CreateCompanyOrgRequest
) -> CompanyOrgOut:
    """Crea una org DENTRO de la Empresa. CE-07: puede llevar un cupo de licencias
    del pool de la Empresa (la suma de cupos no puede exceder el pool)."""
    company = _get_company(db, company_id)
    _assert_quota_fits(db, company, data.license_quota)
    org = Organization(
        name=data.name, slug=data.slug, country=data.country, company_id=company_id,
        license_quota=data.license_quota,
    )
    db.add(org)
    try:
        db.flush()
    except IntegrityError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="organization slug already exists"
        ) from e
    return CompanyOrgOut(
        id=org.id, name=org.name, slug=org.slug, country=org.country,
        user_count=0, license_quota=org.license_quota,
    )


def set_org_license_quota(
    db: Session, *, company_id: UUID, org_id: UUID, license_quota: int
) -> CompanyOrgOut:
    """Asigna el cupo de licencias de una org (valida suma <= pool de la Empresa)."""
    company = _get_company(db, company_id)
    org = _require_company_org(db, company_id, org_id)
    _assert_quota_fits(db, company, license_quota, exclude_org_id=org_id)
    org.license_quota = license_quota
    db.flush()
    user_count = int(
        db.scalar(
            select(func.count(User.id)).where(
                User.org_id == org.id, User.is_active.is_(True)
            )
        )
        or 0
    )
    return CompanyOrgOut(
        id=org.id, name=org.name, slug=org.slug, country=org.country,
        user_count=user_count, license_quota=org.license_quota,
    )


# ─────────────────────────── company_admin: members (roster) ───────────────────────────


def list_company_members(db: Session, company_id: UUID, actor: User) -> list[CompanyMemberOut]:
    """Roster de toda la Empresa: info + progreso + estados del assessment por
    dimensión. RRHH ve estados/score, NUNCA respuestas item-by-item (privacidad).

    Gate de consentimiento granular (TASK 5 · docx §6.2): el `state` individual
    solo se expone si el colaborador autorizó a RRHH (``consent_hr``). Además cada
    miembro trae un ``consent_status`` de 4 valores (pending/declined/
    authorized_no_activity/data_available) que reemplaza el "sin datos" genérico.
    El acceso al roster se audita (``data_access_log``)."""
    from hg.modules.assessment.service import (
        assessment_states_snapshot,
        latest_dimension_results,
    )
    from hg.modules.consent import service as consent_service
    from hg.modules.people.service import activity_by_users

    _get_company(db, company_id)
    rows = db.execute(
        select(User, Organization.name)
        .join(Organization, Organization.id == User.org_id)
        .where(User.company_id == company_id)
        .order_by(Organization.name, User.full_name)
    ).all()
    users = [u for u, _ in rows]
    name_by_id = {u.id: u.full_name for u in users}
    aggs = activity_by_users(db, [u.id for u in users])
    consents = consent_service.privacy_consents_by_user(db, [u.id for u in users])
    consent_service.log_access(db, actor=actor, resource=consent_service.RESOURCE_ROSTER)

    out: list[CompanyMemberOut] = []
    for user, org_name in rows:
        agg = aggs[user.id]
        consent = consents.get(user.id)
        has_activity = agg.courses_completed > 0 or agg.courses_in_progress > 0
        status = consent_service.consent_status(
            consent.consent_hr if consent is not None else None, has_activity
        )
        # El estado por dimensión solo se muestra con autorización a RRHH.
        states = (
            assessment_states_snapshot(latest_dimension_results(db, user.id))
            if consent_service.consent_hr_ok(consent)
            else {}
        )
        out.append(
            CompanyMemberOut(
                id=user.id, full_name=user.full_name, email=user.email, role=user.role,
                org_id=user.org_id, org_name=org_name,
                manager_id=user.manager_id,
                manager_name=name_by_id.get(user.manager_id) if user.manager_id else None,
                is_active=user.is_active,
                last_active_at=agg.last_active_at,
                modules_completed=agg.courses_completed,
                modules_in_progress=agg.courses_in_progress,
                consent_status=status,
                dimension_states={
                    k: MemberDimensionStateOut(**v) for k, v in states.items()
                },
            )
        )
    return out


def invite_to_company_org(
    db: Session, *, company_id: UUID, org_id: UUID, email: str,
    role: UserRole, invited_by: User, name: str | None,
) -> tuple[Invitation, str]:
    """Invita a una org de la Empresa. Valida que la org pertenezca a la Empresa
    y reusa el flujo de identity (cascade de licencias pool+cap incluido)."""
    _require_company_org(db, company_id, org_id)
    return identity_service.create_invitation(
        db, org_id=org_id, email=email, role=role, invited_by=invited_by, name=name
    )


# Roles que un admin de empresa puede asignar desde el roster (no superadmin/company_admin).
_ASSIGNABLE_ROLES = {UserRole.collaborator, UserRole.manager, UserRole.admin}


def update_company_member(
    db: Session, *, company_id: UUID, user_id: UUID, payload: UpdateMemberRequest, actor: User
) -> User:
    """Mover de org, cambiar manager, cambiar rol o activar/desactivar (dentro de la Empresa)."""
    member = _require_company_member(db, company_id, user_id)

    if payload.role is not None and payload.role != member.role:
        if member.id == actor.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No podés cambiar tu propio rol.",
            )
        if payload.role not in _ASSIGNABLE_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rol inválido (solo colaborador, manager o admin).",
            )
        member.role = payload.role

    if payload.org_id is not None and payload.org_id != member.org_id:
        target_org = _require_company_org(db, company_id, payload.org_id)
        member.org_id = target_org.id
        member.company_id = target_org.company_id  # sigue siendo la misma Empresa
        member.manager_id = None  # el manager viejo era de otra org

    if payload.manager_id is not None:
        manager = _require_company_member(db, company_id, payload.manager_id)
        if manager.org_id != member.org_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="manager must be in the same organization",
            )
        member.manager_id = manager.id

    if payload.is_active is not None and payload.is_active != member.is_active:
        # Reactivar consume del pool de la Empresa → validar antes (CE-06: sin
        # contador por-org; el uso se computa por users activos).
        if payload.is_active is True:
            org = db.get(Organization, member.org_id)
            if org is not None:
                identity_service.check_license_available(db, org)
        member.is_active = payload.is_active

    db.flush()
    return member


# ─────────────────────────── Áreas de contenido (superadmin · TASK 8) ───────────────────────────


def list_areas(db: Session) -> list[AreaOut]:
    rows = db.scalars(select(Area).order_by(Area.code)).all()
    return [AreaOut.model_validate(a) for a in rows]


def create_area(db: Session, *, data: CreateAreaRequest) -> AreaOut:
    if db.get(Area, data.code) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="area code already exists")
    area = Area(code=data.code, name=data.name, description=data.description)
    db.add(area)
    db.flush()
    db.refresh(area)
    return AreaOut.model_validate(area)


def update_area(db: Session, *, code: str, data: UpdateAreaRequest) -> AreaOut:
    area = db.get(Area, code)
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="area not found")
    if data.name is not None:
        area.name = data.name
    if data.description is not None:
        area.description = data.description
    if data.is_active is not None:
        area.is_active = data.is_active
    db.flush()
    db.refresh(area)
    return AreaOut.model_validate(area)


# ─────────────────────────── Acceso Empresa↔Área (superadmin · TASK 8) ───────────────────────────


def get_company_access(db: Session, company_id: UUID) -> CompanyAccessOut:
    _require_company(db, company_id)
    codes = list(
        db.scalars(
            select(CompanyAreaAccess.area_code)
            .where(CompanyAreaAccess.company_id == company_id)
            .order_by(CompanyAreaAccess.area_code)
        ).all()
    )
    return CompanyAccessOut(company_id=company_id, area_codes=codes)


def set_company_access(
    db: Session, *, company_id: UUID, area_codes: list[str], granted_by: User
) -> CompanyAccessOut:
    """Reemplaza el set de Áreas habilitadas de la Empresa (diff add/remove).

    Valida que la Empresa exista y que cada código sea un Área real; luego borra
    los rows sobrantes y agrega los faltantes (idempotente vía diff)."""
    _require_company(db, company_id)
    wanted = set(area_codes)
    if wanted:
        real = set(db.scalars(select(Area.code).where(Area.code.in_(wanted))).all())
        unknown = wanted - real
        if unknown:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"áreas inexistentes: {sorted(unknown)}",
            )
    current = {
        row.area_code: row
        for row in db.scalars(
            select(CompanyAreaAccess).where(CompanyAreaAccess.company_id == company_id)
        ).all()
    }
    for code in current.keys() - wanted:  # revocar
        db.delete(current[code])
    for code in wanted - current.keys():  # otorgar
        db.add(
            CompanyAreaAccess(
                company_id=company_id, area_code=code, granted_by_user_id=granted_by.id
            )
        )
    db.flush()
    return CompanyAccessOut(company_id=company_id, area_codes=sorted(wanted))


def _require_company(db: Session, company_id: UUID) -> Company:
    company = db.get(Company, company_id)
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="company not found")
    return company
