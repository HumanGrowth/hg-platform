"""P6A · CD-RISC-10 — resiliencia (0-40) → 3 niveles."""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput

NEXT = {
    "Baja": "Construir base: afrontamiento activo + auto-eficacia.",
    "Media": "Resiliencia como hábito: exposición controlada + recuperación.",
    "Alta": "Sostener y profundizar: acompañar a otros, reforzar identidad.",
}
LABELS = {
    "Baja": "Dificultad sostenida para adaptarse y recuperarse ante adversidad.",
    "Media": "Resiliencia funcional; puede mejorar consistencia bajo presión.",
    "Alta": "Se adapta, aprende del fracaso y mantiene foco bajo presión.",
}


class ResilienceScorer(BaseScorer):
    pillar_code = PillarCode.P6A

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        answered = [by[f"RISC-A{i}"] for i in range(1, 11) if f"RISC-A{i}" in by]
        total = sum(answered)
        n = len(answered)
        # Subset corto (2 items): escalar el umbral proporcionalmente a 10 items.
        scaled = total * (10 / n) if n and n < 10 else total

        if scaled < 24:
            state = "Baja"
        elif scaled <= 31:
            state = "Media"
        else:
            state = "Alta"

        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=state,
            state_label=LABELS[state],
            sub_scores={"total": total, "items_answered": n},
            suggested_next_step=NEXT[state],
        )
