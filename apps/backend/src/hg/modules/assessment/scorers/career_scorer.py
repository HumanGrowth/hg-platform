"""P1 · PMM v3 — weakest link (MIN de C1..C5)."""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput

COMPETENCIES = ["C1", "C2", "C3", "C4", "C5"]
LEVEL_LABEL = {
    1: "Foundation", 2: "Developing", 3: "Applying",
    4: "Enabling", 5: "Advising", 6: "Directing",
}
COMPETENCY_NAME = {
    "C1": "Adaptabilidad y Aprendizaje",
    "C2": "Excelencia Operativa y Colaboración",
    "C3": "Expertise y Pensamiento Estratégico",
    "C4": "Comunicación e Influencia",
    "C5": "Inteligencia Emocional y Social",
}


class CareerScorer(BaseScorer):
    pillar_code = PillarCode.P1

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        levels = {c: int(by.get(f"PMM-{c}", 1)) for c in COMPETENCIES}
        general = min(levels.values())  # weakest link
        # cuello de botella = competencia(s) con el nivel más bajo
        bottleneck = next(c for c in COMPETENCIES if levels[c] == general)
        sub_scores = {c: f"L{levels[c]}" for c in COMPETENCIES}
        nxt = (
            f"Tu próximo crítico de graduación: {bottleneck} "
            f"{COMPETENCY_NAME[bottleneck]}. Enfocá tu desarrollo ahí para subir de nivel."
        )
        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=f"L{general}",
            state_label=LEVEL_LABEL[general],
            sub_scores=sub_scores,
            suggested_next_step=nxt,
        )
