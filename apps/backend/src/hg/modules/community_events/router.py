"""Endpoints de eventos de comunidad (Sprint Tarde · TASK 5).

- Público: `GET /community-events`, `GET /community-events/{id}`.
- Admin: `POST/PATCH/DELETE /admin/community-events` (admin/superadmin).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.db import get_db
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


@public_router.get("/community-events", response_model=CommunityEventListResponse)
def list_events(db: Session = Depends(get_db)) -> CommunityEventListResponse:
    return CommunityEventListResponse(items=service.list_community_events(db))


@public_router.get("/community-events/{event_id}", response_model=CommunityEventOut)
def get_event(event_id: UUID, db: Session = Depends(get_db)) -> CommunityEventOut:
    try:
        return service.get_community_event(db, event_id)
    except service.CommunityEventError as exc:
        raise _not_found(exc) from exc


@admin_router.get("/community-events", response_model=CommunityEventListResponse)
def admin_list_events(
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("admin", "superadmin")),
) -> CommunityEventListResponse:
    # Incluye inactivos para gestión.
    return CommunityEventListResponse(items=service.list_community_events(db, only_active=False))


@admin_router.post(
    "/community-events", response_model=CommunityEventOut, status_code=status.HTTP_201_CREATED
)
def create_event(
    payload: CommunityEventCreate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("admin", "superadmin")),
) -> CommunityEventOut:
    return service.create_community_event(db, payload)


@admin_router.patch("/community-events/{event_id}", response_model=CommunityEventOut)
def update_event(
    event_id: UUID,
    payload: CommunityEventUpdate,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("admin", "superadmin")),
) -> CommunityEventOut:
    try:
        return service.update_community_event(db, event_id, payload)
    except service.CommunityEventError as exc:
        raise _not_found(exc) from exc


@admin_router.delete("/community-events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: UUID,
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("admin", "superadmin")),
) -> None:
    try:
        service.delete_community_event(db, event_id)
    except service.CommunityEventError as exc:
        raise _not_found(exc) from exc
