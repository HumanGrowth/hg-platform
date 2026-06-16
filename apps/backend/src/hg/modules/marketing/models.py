"""Marketing models: ContactInquiry (leads del sitio público).

Sin ``org_id``: son leads, no usuarios de un tenant todavía. La tabla no lleva
RLS — sólo el superadmin la lee vía endpoint admin; el POST es público y corre
bajo ``hg_superadmin``.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class ContactInquiry(Base):
    __tablename__ = "contact_inquiries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(254), nullable=False, index=True)
    company: Mapped[str | None] = mapped_column(String(255))
    role: Mapped[str | None] = mapped_column(String(50))
    message: Mapped[str | None] = mapped_column(String(2000))
    source: Mapped[str | None] = mapped_column(String(50))  # "landing-hero", "footer", ...
    contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
