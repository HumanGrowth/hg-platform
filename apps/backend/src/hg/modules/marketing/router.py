"""Marketing routers: contact inquiries.

- ``public_router`` (sin auth): POST /contact/inquiry — el form del sitio.
- ``admin_router`` (superadmin): GET /admin/contact/inquiries — lista de leads.

Ambos operan bajo ``hg_superadmin`` (la tabla no tiene RLS; son leads, no
usuarios de un tenant). El POST es público por diseño.
"""
from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.core.deps import get_db_as_superadmin, require_role
from hg.modules.identity.models import User
from hg.modules.marketing.models import ContactInquiry
from hg.modules.marketing.schemas import (
    ContactInquiryIn,
    ContactInquiryListResponse,
    ContactInquiryOut,
)

log = logging.getLogger("hg.marketing")

public_router = APIRouter()
admin_router = APIRouter()


@public_router.post("/contact/inquiry", status_code=status.HTTP_201_CREATED)
def submit_inquiry(
    payload: ContactInquiryIn,
    db: Session = Depends(get_db_as_superadmin),
) -> dict[str, bool]:
    if "@" not in payload.email:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="invalid email"
        )
    inquiry = ContactInquiry(
        name=payload.name,
        email=payload.email,
        company=payload.company,
        role=payload.role,
        message=payload.message,
        source=payload.source,
    )
    db.add(inquiry)
    db.flush()
    # Notificación interna a LEADS_INBOX (admin@humangrowth.io). No rompe el submit
    # si el email falla (email_service.send loguea y devuelve status).
    from hg.config import get_settings
    from hg.modules.notifications.email_service import email_service

    settings = get_settings()
    email_service.send(
        to=settings.leads_inbox,
        subject=f"Nuevo contacto: {payload.name}",
        template="contact_inquiry",
        context={
            "name": payload.name,
            "email": payload.email,
            "company": payload.company,
            "role": payload.role,
            "message": payload.message,
            "source": payload.source,
        },
    )
    return {"ok": True}


@admin_router.get("/contact/inquiries", response_model=ContactInquiryListResponse)
def list_inquiries(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db_as_superadmin),
    _: User = Depends(require_role("superadmin")),
) -> ContactInquiryListResponse:
    total = db.scalar(select(func.count()).select_from(ContactInquiry)) or 0
    rows = db.scalars(
        select(ContactInquiry)
        .order_by(ContactInquiry.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()
    return ContactInquiryListResponse(
        items=[ContactInquiryOut.model_validate(r) for r in rows], total=total
    )
