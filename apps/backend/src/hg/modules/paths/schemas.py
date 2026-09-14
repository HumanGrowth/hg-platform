"""Schemas de rutas customizables (FASE 2.2)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from hg.modules.paths.models import CustomPathScope


class CustomPathItemIn(BaseModel):
    learning_unit_id: UUID
    is_required: bool = True


class CustomPathItemOut(BaseModel):
    id: UUID
    learning_unit_id: UUID
    unit_slug: str
    unit_title: str
    order_index: int
    is_required: bool


class CreateCustomPathRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    scope: CustomPathScope
    org_id: UUID | None = None  # requerido si scope=org


class UpdateCustomPathRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    is_active: bool | None = None


class CustomPathOut(BaseModel):
    id: UUID
    name: str
    description: str | None
    scope: CustomPathScope
    company_id: UUID
    org_id: UUID | None
    org_name: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    items: list[CustomPathItemOut]
    assigned_member_count: int


class SetCustomPathItemsRequest(BaseModel):
    """Reemplaza el set completo de items — el orden de la lista es el
    `order_index`. Simplifica la UI (una sola "Guardar" en vez de add/remove/
    reorder por separado)."""

    items: list[CustomPathItemIn] = Field(max_length=200)


class SetCustomPathAssignmentsRequest(BaseModel):
    """Reemplaza el set completo de miembros puntuales asignados."""

    user_ids: list[UUID] = Field(max_length=1000)


class ResolvedCustomPathOut(BaseModel):
    custom_path_id: UUID | None
    custom_path_name: str | None
