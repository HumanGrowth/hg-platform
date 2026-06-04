"""Analytics models: daily materialized org-level metrics.

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
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from hg.db import Base


class OrgAssessmentAggregate(Base):
    """Daily snapshot of adoption and completion metrics per organization.

    Populated by a nightly Celery beat task (see B4-07).
    """

    __tablename__ = "org_assessment_aggregates"
    __table_args__ = (UniqueConstraint("org_id", "date", name="uq_org_agg_org_date"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    total_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    # e.g. {"P1": 0.72, "P2": 0.55, ...}
    completion_rate_by_pillar: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    # e.g. {"P1": 0.81, "P2": 0.63, ...}
    avg_scores_by_pillar: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
