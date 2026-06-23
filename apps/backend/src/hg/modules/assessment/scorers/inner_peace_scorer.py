"""P5 · ERQ + AAQ-II — reevaluación vs supresión + flexibilidad → 4 niveles."""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput, avg

LABELS = {"N1": "Reactivo", "N2": "Consciente", "N3": "Regulado", "N4": "Flexible"}
NEXT = {
    "N1": "Notar antes de reaccionar: mindfulness introductorio (MBSR).",
    "N2": "Reevaluar en lugar de suprimir: entrenamiento Gross + journaling.",
    "N3": "Actuar con valores bajo presión: ACT (Hayes).",
    "N4": "Sostener y profundizar: integración a identidad, acompañar a otros.",
}


class InnerPeaceScorer(BaseScorer):
    pillar_code = PillarCode.P5

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        reev = avg([float(by[f"ERQ-A{i}"]) for i in range(1, 7) if f"ERQ-A{i}" in by])
        supr = avg([float(by[f"ERQ-A{i}"]) for i in range(7, 11) if f"ERQ-A{i}" in by])
        flex = (8 - by["AAQ-B1"]) if "AAQ-B1" in by else None  # invertido

        if reev >= 4.5 and supr < 3.5:
            state = "N4" if (flex is not None and flex >= 5) else "N3"
        elif reev < 3.5 and supr >= 4.5:
            state = "N1"
        else:
            state = "N2"

        sub_scores = {"reevaluacion": round(reev, 2), "supresion": round(supr, 2)}
        if flex is not None:
            sub_scores["flexibilidad"] = round(float(flex), 2)

        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=state,
            state_label=LABELS[state],
            sub_scores=sub_scores,
            suggested_next_step=NEXT[state],
        )
