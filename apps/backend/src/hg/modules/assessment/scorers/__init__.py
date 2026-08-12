"""Registry de scorers (strategy pattern) — uno por pilar."""
from __future__ import annotations

from hg.modules.assessment.enums import DimensionCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput
from hg.modules.assessment.scorers.career_scorer import CareerScorer
from hg.modules.assessment.scorers.financial_scorer import FinancialScorer
from hg.modules.assessment.scorers.health_scorer import HealthScorer
from hg.modules.assessment.scorers.inner_peace_scorer import InnerPeaceScorer
from hg.modules.assessment.scorers.purpose_scorer import PurposeScorer
from hg.modules.assessment.scorers.relationships_scorer import RelationshipsScorer
from hg.modules.assessment.scorers.resilience_scorer import ResilienceScorer

SCORERS: dict[DimensionCode, BaseScorer] = {
    DimensionCode.P1: CareerScorer(),
    DimensionCode.P2: PurposeScorer(),
    DimensionCode.P3: RelationshipsScorer(),
    DimensionCode.P4: HealthScorer(),
    DimensionCode.P5: InnerPeaceScorer(),
    DimensionCode.P6A: ResilienceScorer(),
    DimensionCode.P6B: FinancialScorer(),
}


def score_dimension(dimension: DimensionCode, inp: ScoringInput) -> ScoringOutput:
    return SCORERS[dimension].score(inp)


__all__ = ["SCORERS", "ScoringInput", "ScoringOutput", "score_dimension"]
