"""Base del strategy pattern de scoring (B2-02).

Cada pilar tiene su propio scorer porque la estructura del resultado difiere
(estados Damon vs niveles Prochaska vs niveles ordinales). El radar muestra
estados, no scores uniformes 0-100.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta

from hg.modules.assessment.enums import PillarCode, ResultSource
from hg.modules.assessment.models import AssessmentItem, AssessmentResponse


@dataclass
class ScoringInput:
    responses: list[AssessmentResponse]
    items: dict[uuid.UUID, AssessmentItem]  # lookup por item_id
    source: ResultSource

    @property
    def by_code(self) -> dict[str, int]:
        """response_value crudo indexado por item_code (sin invertir)."""
        out: dict[str, int] = {}
        for r in self.responses:
            item = self.items.get(r.item_id)
            if item is not None:
                out[item.item_code] = r.response_value
        return out


@dataclass
class ScoringOutput:
    pillar_code: PillarCode
    state_code: str
    state_label: str
    sub_scores: dict = field(default_factory=dict)
    requires_user_confirmation: bool = False
    recaida_detected: bool = False
    suggested_next_step: str | None = None


class BaseScorer:
    pillar_code: PillarCode

    def score(self, inp: ScoringInput) -> ScoringOutput:
        raise NotImplementedError

    def next_retake_eligible_at(self, source: ResultSource) -> datetime:
        # preliminary: re-take inmediato (upgrade a confirmed).
        # confirmed: 30 días (o al completar path activo, chequeado fuera del scorer).
        if source == ResultSource.preliminary:
            return datetime.now(UTC)
        return datetime.now(UTC) + timedelta(days=30)


def avg(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0
