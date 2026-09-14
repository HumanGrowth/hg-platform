"""Onboarding ("capa 0"): restricción de contenido para colaboradores/managers
nuevos hasta que reciben su primera asignación de la organización/empresa."""
from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import delete

from hg.db import SessionLocal
from hg.modules.identity.models import UserRole
from hg.modules.learning_units import path_engine
from hg.modules.learning_units.models import ModuleAssignment
from hg.modules.learning_units.onboarding import (
    ONBOARDING_DIMENSION_CODE,
    build_onboarding_status,
    has_been_assigned_content,
    is_content_restricted,
)
from hg.modules.paths.models import CustomPath, CustomPathScope

from ._lu_helpers import cleanup_units, make_unit, seed_attempt


def _cleanup_assignments(user_ids: list) -> None:
    s = SessionLocal()
    s.execute(delete(ModuleAssignment).where(ModuleAssignment.user_id.in_(user_ids)))
    s.commit()
    s.close()


def _cleanup_paths(ids: list) -> None:
    s = SessionLocal()
    s.execute(delete(CustomPath).where(CustomPath.id.in_(ids)))
    s.commit()
    s.close()


# ─────────────────────────── has_been_assigned_content / is_content_restricted ───────────────────────────


def test_has_been_assigned_content_false_by_default(factory) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    assert has_been_assigned_content(factory.session, user) is False


def test_has_been_assigned_content_true_with_module_assignment(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=unit.id))
        s.commit()
        assert has_been_assigned_content(s, user) is True
    finally:
        _cleanup_assignments([user.id])
        cleanup_units(s, [unit.id])


def test_has_been_assigned_content_true_with_custom_path(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    cp = CustomPath(name="Empresa X", scope=CustomPathScope.company, company_id=org.company_id)
    s.add(cp)
    s.commit()
    try:
        assert has_been_assigned_content(s, user) is True
    finally:
        _cleanup_paths([cp.id])


def test_is_content_restricted_true_for_new_collaborator(factory) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    assert is_content_restricted(factory.session, user) is True


def test_is_content_restricted_true_for_new_manager(factory) -> None:
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.manager)
    assert is_content_restricted(factory.session, user) is True


def test_is_content_restricted_false_for_admin_roles_regardless(factory) -> None:
    org = factory.make_org()
    for role in (UserRole.admin, UserRole.company_admin, UserRole.superadmin):
        user = factory.make_user(org=org, role=role)
        assert is_content_restricted(factory.session, user) is False


def test_is_content_restricted_false_once_assigned(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        assert is_content_restricted(s, user) is True
        s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=unit.id))
        s.commit()
        assert is_content_restricted(s, user) is False
    finally:
        _cleanup_assignments([user.id])
        cleanup_units(s, [unit.id])


# ─────────────────────────── build_onboarding_status ───────────────────────────


def test_build_onboarding_status_tracks_progress(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    on1 = make_unit(s, dimension_code=ONBOARDING_DIMENSION_CODE, level_code="L1", n_blocks=1)
    on2 = make_unit(s, dimension_code=ONBOARDING_DIMENSION_CODE, level_code="L1", n_blocks=1)
    on1.unit_number, on2.unit_number = 1, 2
    s.commit()
    seed_attempt(s, org_id=org.id, user_id=user.id, unit=on1, when=datetime.now(UTC), completed=True)
    try:
        status = build_onboarding_status(s, user)
        assert status.is_restricted is True
        assert status.total_count == 2
        assert status.completed_count == 1
        assert status.all_completed is False
        assert [u.slug for u in status.units] == [on1.slug, on2.slug]
        assert status.units[0].completed is True
        assert status.units[1].completed is False
    finally:
        cleanup_units(s, [on1.id, on2.id])


# ─────────────────────────── path_engine: ON queda afuera del track normal ───────────────────────────


def test_build_path_never_recommends_onboarding_units(factory) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    on_unit = make_unit(s, dimension_code=ONBOARDING_DIMENSION_CODE, level_code="L1", n_blocks=1)
    cp_unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        result = path_engine.build_path(s, user.id)
        seq_ids = [result.next_step.unit_id] if result.next_step else []
        seq_ids += [st.unit_id for st in result.upcoming]
        assert on_unit.id not in seq_ids
        assert cp_unit.id in seq_ids
    finally:
        cleanup_units(s, [on_unit.id, cp_unit.id])


# ─────────────────────────── enforcement HTTP: /modulos/{slug} ───────────────────────────


def test_restricted_collaborator_can_access_onboarding_unit(client, factory, auth_headers) -> None:
    # `attempts/start` (no `GET .../{slug}` detalle) porque `_lu_helpers.make_unit`
    # crea un `UnitBlock` con `block_id` random ("FK polimórfico sin constraint",
    # ver su docstring) — suficiente para probar el gating de acceso, no para
    # renderizar el detalle completo de la unit.
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code=ONBOARDING_DIMENSION_CODE, level_code="L1", n_blocks=1)
    try:
        res = client.post(f"/api/v1/modulos/{unit.slug}/attempts/start", headers=auth_headers(user))
        assert res.status_code == 200, res.text
    finally:
        cleanup_units(s, [unit.id])


def test_restricted_collaborator_cannot_access_other_content(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        res = client.get(f"/api/v1/modulos/{unit.slug}", headers=auth_headers(user))
        assert res.status_code == 403
    finally:
        cleanup_units(s, [unit.id])


def test_unlocked_collaborator_can_access_other_content(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=unit.id))
        s.commit()
        res = client.post(f"/api/v1/modulos/{unit.slug}/attempts/start", headers=auth_headers(user))
        assert res.status_code == 200, res.text
    finally:
        _cleanup_assignments([user.id])
        cleanup_units(s, [unit.id])


def test_admin_is_never_restricted(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    admin = factory.make_user(org=org, role=UserRole.admin)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        res = client.post(f"/api/v1/modulos/{unit.slug}/attempts/start", headers=auth_headers(admin))
        assert res.status_code == 200, res.text
    finally:
        cleanup_units(s, [unit.id])


def test_start_attempt_also_blocked_while_restricted(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        res = client.post(f"/api/v1/modulos/{unit.slug}/attempts/start", headers=auth_headers(user))
        assert res.status_code == 403
    finally:
        cleanup_units(s, [unit.id])


# ─────────────────────────── /me/onboarding + /auth/me ───────────────────────────


def test_me_onboarding_endpoint(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code=ONBOARDING_DIMENSION_CODE, level_code="L1", n_blocks=1)
    unit.unit_number = 1
    s.commit()
    try:
        res = client.get("/api/v1/me/onboarding", headers=auth_headers(user))
        assert res.status_code == 200, res.text
        body = res.json()
        assert body["is_restricted"] is True
        assert body["total_count"] == 1
        assert body["completed_count"] == 0
        assert body["units"][0]["slug"] == unit.slug
    finally:
        cleanup_units(s, [unit.id])


def test_auth_me_reports_content_restricted_flag(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        before = client.get("/api/v1/auth/me", headers=auth_headers(user))
        assert before.status_code == 200
        assert before.json()["content_restricted_to_onboarding"] is True

        s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=unit.id))
        s.commit()
        after = client.get("/api/v1/auth/me", headers=auth_headers(user))
        assert after.json()["content_restricted_to_onboarding"] is False
    finally:
        _cleanup_assignments([user.id])
        cleanup_units(s, [unit.id])


# ─────────────────────────── feed excluye ON siempre ───────────────────────────


def test_feed_never_includes_onboarding_units(client, factory, auth_headers) -> None:
    s = factory.session
    org = factory.make_org()
    user = factory.make_user(org=org, role=UserRole.collaborator)
    on_unit = make_unit(s, dimension_code=ONBOARDING_DIMENSION_CODE, level_code="L1", n_blocks=1)
    cp_unit = make_unit(s, dimension_code="CP", level_code="L1", n_blocks=1)
    try:
        s.add(ModuleAssignment(org_id=org.id, user_id=user.id, learning_unit_id=cp_unit.id))
        s.commit()
        res = client.get("/api/v1/modulos/feed", headers=auth_headers(user))
        assert res.status_code == 200, res.text
        body = res.json()
        all_ids = ([body["hero"]["id"]] if body["hero"] else []) + [i["id"] for i in body["next"]]
        assert str(on_unit.id) not in all_ids
    finally:
        _cleanup_assignments([user.id])
        cleanup_units(s, [on_unit.id, cp_unit.id])
