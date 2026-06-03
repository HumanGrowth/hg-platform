"""API v1 — agrega routers de cada módulo de dominio."""
from __future__ import annotations

from fastapi import APIRouter

# Routers por módulo (descomentar conforme se implementen)
# from hg.modules.identity.router import router as identity_router
# from hg.modules.people.router import router as people_router
# from hg.modules.learning.router import router as learning_router

router = APIRouter()


@router.get("/", tags=["meta"])
def api_root() -> dict[str, str]:
    return {"api": "hg", "version": "v1"}


# router.include_router(identity_router, prefix="/auth", tags=["auth"])
# router.include_router(people_router, prefix="/people", tags=["people"])
# router.include_router(learning_router, prefix="/learning", tags=["learning"])
