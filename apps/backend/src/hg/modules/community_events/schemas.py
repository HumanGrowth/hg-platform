"""Schemas de eventos de comunidad (Sprint Tarde · TASK 5).

Los nombres de campo siguen el spec (type/hero_image_url/starts_at/sort_order);
el modelo `Event` los guarda como event_type/thumbnail_url/scheduled_at/order_index.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from hg.modules.learning.models import EventType

# Los tipos válidos para un evento de comunidad (todos los de EventType).
CommunityEventType = EventType


class CommunityEventOut(BaseModel):
    id: UUID
    type: str
    title: str
    slug: str
    description: str | None
    hero_image_url: str | None
    cta_url: str | None
    cta_label: str | None
    starts_at: datetime | None
    ends_at: datetime | None
    is_featured: bool
    sort_order: int


class CommunityEventListResponse(BaseModel):
    items: list[CommunityEventOut]


class CommunityEventCreate(BaseModel):
    type: CommunityEventType
    title: str
    description: str | None = None
    hero_image_url: str | None = None
    cta_url: str | None = None
    cta_label: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_featured: bool = False
    sort_order: int = 0


class CommunityEventUpdate(BaseModel):
    type: CommunityEventType | None = None
    title: str | None = None
    description: str | None = None
    hero_image_url: str | None = None
    cta_url: str | None = None
    cta_label: str | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    is_featured: bool | None = None
    sort_order: int | None = None
    is_active: bool | None = None
