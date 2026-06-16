"""Pydantic v2 schemas para marketing (contact inquiries)."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# `str` y no EmailStr (igual que identity): email-validator rechaza TLDs como
# `.test`. Validamos lo mínimo (presencia de "@") en el router.
Email = str


class ContactInquiryIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    email: Email = Field(min_length=3, max_length=254)
    company: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=50)
    message: str | None = Field(default=None, max_length=2000)
    source: str | None = Field(default=None, max_length=50)


class ContactInquiryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    company: str | None
    role: str | None
    message: str | None
    source: str | None
    contacted_at: datetime | None
    created_at: datetime


class ContactInquiryListResponse(BaseModel):
    items: list[ContactInquiryOut]
    total: int
