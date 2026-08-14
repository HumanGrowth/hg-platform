"""API v1 — agrega routers de cada módulo de dominio."""
from __future__ import annotations

from fastapi import APIRouter

from hg.modules.admin.router import router as admin_router
from hg.modules.admin.upload_router import router as admin_upload_router
from hg.modules.assessment.router import router as assessment_router
from hg.modules.badges.router import me_router as badges_me_router
from hg.modules.community_events.router import admin_router as community_events_admin_router
from hg.modules.community_events.router import public_router as community_events_public_router
from hg.modules.company.router import admin_router as company_admin_router
from hg.modules.company.router import company_router
from hg.modules.consent.router import router as consent_me_router
from hg.modules.identity.router import router as identity_router
from hg.modules.learning.router import router as learning_router
from hg.modules.learning_units.admin_router import router as learning_units_admin_router
from hg.modules.learning_units.assignments_router import admin_router as assignments_admin_router
from hg.modules.learning_units.assignments_router import me_router as assignments_me_router
from hg.modules.learning_units.path_router import router as path_me_router
from hg.modules.learning_units.router import router as learning_units_router
from hg.modules.learning_units.tips_router import router as tips_me_router
from hg.modules.marketing.router import admin_router as marketing_admin_router
from hg.modules.marketing.router import public_router as marketing_public_router
from hg.modules.people.router import admin_router as people_admin_router
from hg.modules.people.router import manager_router, me_router
from hg.modules.perspectives.router import admin_router as perspectives_admin_router
from hg.modules.perspectives.router import public_router as perspectives_public_router

router = APIRouter()


@router.get("/", tags=["meta"])
def api_root() -> dict[str, str]:
    return {"api": "hg", "version": "v1"}


router.include_router(identity_router, prefix="/auth", tags=["auth"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
# Capa Empresa (TASK 2): /company/* (company_admin + superadmin) + /admin/companies (superadmin).
router.include_router(company_router, prefix="/company", tags=["company"])
router.include_router(company_admin_router, prefix="/admin", tags=["admin", "company"])
# Consentimiento de privacidad (Capa Empresa · TASK 5): GET/POST /me/consent
router.include_router(consent_me_router, prefix="/me", tags=["consent"])
# Upload de imágenes admin → R2: POST /admin/upload/image (superadmin)
router.include_router(admin_upload_router, prefix="/admin", tags=["admin", "upload"])
# Marketing: POST /contact/inquiry (público) + GET /admin/contact/inquiries (superadmin)
router.include_router(marketing_public_router, tags=["marketing"])
router.include_router(marketing_admin_router, prefix="/admin", tags=["marketing"])
# Catálogo PMM: /paths, /paths/{code}, /paths/{code}/courses, /courses (auth)
router.include_router(learning_router, tags=["catalog"])
# Eventos de comunidad (Sprint Tarde · TASK 5): /community-events (público) +
# /admin/community-events (admin/superadmin CRUD).
router.include_router(community_events_public_router, tags=["events"])
router.include_router(community_events_admin_router, prefix="/admin", tags=["admin", "events"])
# Learning Units: /modulos/feed, /modulos/{slug}, attempts, quiz/reflection submit (auth)
router.include_router(learning_units_router, tags=["learning-units"])
# Learning Units CMS: /admin/learning-units, /admin/blocks/* (superadmin)
router.include_router(learning_units_admin_router, prefix="/admin", tags=["admin", "learning-units"])
# Asignaciones de módulos (cierre-beta TASK 3): /admin/users/{id}/assignments +
# /admin/assignments/{id} (manager/admin) · /me/assignments (colaborador)
router.include_router(assignments_admin_router, prefix="/admin", tags=["admin", "assignments"])
router.include_router(assignments_me_router, prefix="/me", tags=["assignments"])
# Mi Ruta (cierre-beta TASK 1): motor de recomendación GET /me/path
router.include_router(path_me_router, prefix="/me", tags=["path"])
# Plan de Acción (cierre-beta TASK 5): /me/tips CRUD + /me/plan-accion/ai-summary
router.include_router(tips_me_router, prefix="/me", tags=["tips"])
# Perspectivas CMS (cierre-beta): /perspectives (público) + /admin/perspectives (superadmin)
router.include_router(perspectives_public_router, tags=["perspectives"])
router.include_router(perspectives_admin_router, prefix="/admin", tags=["admin", "perspectives"])
# Manager: /manager/me/team + /manager/users/{id}/... (B4-A)
router.include_router(manager_router, prefix="/manager", tags=["manager"])
# RRHH: /admin/org/metrics + /admin/org/users/export.csv (B4-A)
router.include_router(people_admin_router, prefix="/admin", tags=["admin"])
# Home colaborador: /me/home dashboard agregado (B3-04)
router.include_router(me_router, prefix="/me", tags=["home"])
router.include_router(badges_me_router, prefix="/me", tags=["badges"])
# Motor de assessment: /assessment/sessions, /me/results, ... (B2-02/B2-03)
router.include_router(assessment_router, prefix="/assessment", tags=["assessment"])
