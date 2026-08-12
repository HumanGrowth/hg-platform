"""Registry de scorers (strategy pattern) — uno por pilar."""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput
from hg.modules.assessment.scorers.career_scorer import CareerScorer
from hg.modules.assessment.scorers.financial_scorer import FinancialScorer
from hg.modules.assessment.scorers.health_scorer import HealthScorer
from hg.modules.assessment.scorers.inner_peace_scorer import InnerPeaceScorer
from hg.modules.assessment.scorers.purpose_scorer import PurposeScorer
from hg.modules.assessment.scorers.relationships_scorer import RelationshipsScorer
from hg.modules.assessment.scorers.resilience_scorer import ResilienceScorer

SCORERS: dict[PillarCode, BaseScorer] = {
    PillarCode.P1: CareerScorer(),
    PillarCode.P2: PurposeScorer(),
    PillarCode.P3: RelationshipsScorer(),
    PillarCode.P4: HealthScorer(),
    PillarCode.P5: InnerPeaceScorer(),
    PillarCode.P6A: ResilienceScorer(),
    PillarCode.P6B: FinancialScorer(),
}


def score_pillar(pillar: PillarCode, inp: ScoringInput) -> ScoringOutput:
    return SCORERS[pillar].score(inp)


__all__ = ["SCORERS", "ScoringInput", "ScoringOutput", "score_pillar"]
