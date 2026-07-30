"""Lógica de eventos de comunidad (Sprint Tarde · TASK 5).

Reutiliza el modelo ``Event``. Un evento de comunidad es un ``Event`` con
``career_path_id IS NULL`` (el contenido de aprendizaje siempre lleva pilar).
"""
from __future__ import annotations

import re
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.community_events.schemas import (
    CommunityEventCreate,
    CommunityEventOut,
    CommunityEventUpdate,
)
from hg.modules.learning.models import Event


class CommunityEventError(Exception):
    """Error de dominio (→ 4xx en el router)."""


def _slugify(title: str) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return base or "evento"


def _unique_slug(db: Session, title: str) -> str:
    base = _slugify(title)
    slug = base
    i = 2
    while db.scalar(select(Event).where(Event.slug == slug)) is not None:
        slug = f"{base}-{i}"
        i += 1
    return slug


def _to_out(e: Event) -> CommunityEventOut:
    return CommunityEventOut(
        id=e.id,
        type=e.event_type.value,
        title=e.title,
        slug=e.slug,
        description=e.description,
        hero_image_url=e.thumbnail_url,
        cta_url=e.cta_url,
        cta_label=e.cta_label,
        starts_at=e.scheduled_at,
        ends_at=e.ends_at,
        is_featured=e.is_featured,
        sort_order=e.order_index,
    )


def _community_query():
    # Discriminador: eventos de comunidad = sin career_path.
    return select(Event).where(Event.career_path_id.is_(None))


def list_community_events(db: Session, *, only_active: bool = True) -> list[CommunityEventOut]:
    stmt = _community_query()
    if only_active:
        stmt = stmt.where(Event.is_active.is_(True))
    stmt = stmt.order_by(
        Event.is_featured.desc(), Event.order_index, Event.scheduled_at.asc().nullslast()
    )
    return [_to_out(e) for e in db.scalars(stmt).all()]


def get_community_event(db: Session, event_id: uuid.UUID) -> CommunityEventOut:
    e = db.scalar(_community_query().where(Event.id == event_id))
    if e is None:
        raise CommunityEventError("evento no encontrado")
    return _to_out(e)


def create_community_event(db: Session, payload: CommunityEventCreate) -> CommunityEventOut:
    event = Event(
        career_path_id=None,  # discriminador
        career_level=None,
        title=payload.title,
        slug=_unique_slug(db, payload.title),
        description=payload.description,
        thumbnail_url=payload.hero_image_url,
        event_type=payload.type,
        cta_url=payload.cta_url,
        cta_label=payload.cta_label,
        scheduled_at=payload.starts_at,
        ends_at=payload.ends_at,
        is_featured=payload.is_featured,
        order_index=payload.sort_order,
        is_active=True,
    )
    db.add(event)
    db.flush()
    return _to_out(event)


def update_community_event(
    db: Session, event_id: uuid.UUID, payload: CommunityEventUpdate
) -> CommunityEventOut:
    e = db.scalar(_community_query().where(Event.id == event_id))
    if e is None:
        raise CommunityEventError("evento no encontrado")
    data = payload.model_dump(exclude_unset=True)
    field_map = {
        "type": "event_type",
        "hero_image_url": "thumbnail_url",
        "starts_at": "scheduled_at",
        "sort_order": "order_index",
    }
    for key, value in data.items():
        setattr(e, field_map.get(key, key), value)
    db.flush()
    return _to_out(e)


def delete_community_event(db: Session, event_id: uuid.UUID) -> None:
    e = db.scalar(_community_query().where(Event.id == event_id))
    if e is None:
        raise CommunityEventError("evento no encontrado")
    db.delete(e)
    db.flush()
