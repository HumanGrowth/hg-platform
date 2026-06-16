"""API v1 — agrega routers de cada módulo de dominio."""
from __future__ import annotations

from fastapi import APIRouter

from hg.modules.admin.router import router as admin_router
from hg.modules.identity.router import router as identity_router
from hg.modules.marketing.router import admin_router as marketing_admin_router
from hg.modules.marketing.router import public_router as marketing_public_router

router = APIRouter()


@router.get("/", tags=["meta"])
def api_root() -> dict[str, str]:
    return {"api": "hg", "version": "v1"}


router.include_router(identity_router, prefix="/auth", tags=["auth"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
# Marketing: POST /contact/inquiry (público) + GET /admin/contact/inquiries (superadmin)
router.include_router(marketing_public_router, tags=["marketing"])
router.include_router(marketing_admin_router, prefix="/admin", tags=["marketing"])
