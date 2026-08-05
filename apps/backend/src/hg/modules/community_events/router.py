"""Endpoints de eventos de comunidad (Sprint Tarde · TASK 5).

- Público: `GET /community-events`, `GET /community-events/{id}`.
- Admin: `POST/PATCH/DELETE /admin/community-events` (admin/superadmin).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from hg.core.deps import get_current_user, get_db_as_superadmin, require_role
from hg.modules.community_events import service
from hg.modules.community_events.schemas import (
    CommunityEventCreate,
    CommunityEventListResponse,
    CommunityEventOut,
    CommunityEventUpdate,
)
from hg.modules.identity.models import User

public_router = APIRouter()
admin_router = APIRouter()


def _not_found(exc: service.CommunityEventError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))


# Catálogo global de events (sin RLS): se lee bajo hg_superadmin igual que el
# resto del catálogo de aprendizaje (learning.router). Requiere sesión (la
# página /eventos es autenticada) — get_db (hg_app sin org) da 500 en prod.
@public_router.get("/community-events", response_model=CommunityEventListResponse)
def list_events(
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(get_current_user),
) -> CommunityEventListResponse:
    return CommunityEventListResponse(items=service.list_community_events(db))


@public_router.get("/community-events/{event_id}", response_model=CommunityEventOut)
def get_event(
    event_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(get_current_user),
) -> CommunityEventOut:
    try:
        return service.get_community_event(db, event_id)
    except service.CommunityEventError as exc:
        raise _not_found(exc) from exc


@admin_router.get("/community-events", response_model=CommunityEventListResponse)
def admin_list_events(
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> CommunityEventListResponse:
    # Incluye inactivos para gestión.
    return CommunityEventListResponse(items=service.list_community_events(db, only_active=False))


@admin_router.post(
    "/community-events", response_model=CommunityEventOut, status_code=status.HTTP_201_CREATED
)
def create_event(
    payload: CommunityEventCreate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> CommunityEventOut:
    return service.create_community_event(db, payload)


@admin_router.patch("/community-events/{event_id}", response_model=CommunityEventOut)
def update_event(
    event_id: UUID,
    payload: CommunityEventUpdate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> CommunityEventOut:
    try:
        return service.update_community_event(db, event_id, payload)
    except service.CommunityEventError as exc:
        raise _not_found(exc) from exc


@admin_router.delete("/community-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> None:
    try:
        service.delete_community_event(db, event_id)
    except service.CommunityEventError as exc:
        raise _not_found(exc) from exc
