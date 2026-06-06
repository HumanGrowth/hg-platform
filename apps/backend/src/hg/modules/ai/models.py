"""AI models: conversation history for the RAG chatbot (Phase 1.5).

⚠️ DRAFT — generado adelantando trabajo. Depende de:
  - DEC-01 (algoritmo de scoring)
  - DEC-02 (reglas de recomendación de path)
  - DEC-05 (contenido de escenarios situacionales)
  - DEC-07 (criterio de pilar completado)

Revisar y firmar contra el doc final de decisiones antes de generar la
migración productiva. Hoy se incluyen en metadata para que Alembic los
detecte, pero NO deberían ejecutarse cambios destructivos hasta validar.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class AiConversation(Base):
    """Persisted chat history between a user and the RAG course assistant.

    messages format: [{"role": "user"|"assistant", "content": "...", "ts": "<iso>"}]
    """

    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    messages: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
