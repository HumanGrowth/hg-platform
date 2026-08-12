"""P3 · UCLA-3 + Cacioppo — soledad + dimensiones → 4 niveles.

N4 (Generativo) no es deducible por puntaje: cuando se detecta perfil N3 se marca
``requires_user_confirmation`` y el estado queda en N3 hasta que el user confirma.
"""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput, avg

LABELS = {
    "N1": "Aislamiento", "N2": "Funcional", "N3": "Integrado", "N4": "Generativo",
}
NEXT = {
    "N1": "Construir base: pequeños pasos, pedir ayuda.",
    "N2": "Profundizar vínculos: vulnerabilidad calibrada, escucha activa.",
    "N3": "Ser conector: facilitación, mentoría. ¿Ya ayudás a otros a conectar? Confirmá tu nivel.",
    "N4": "Reforzar rol de conector, ampliar impacto colectivo.",
}


class RelationshipsScorer(BaseScorer):
    pillar_code = PillarCode.P3

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        soledad_items = [by[c] for c in ("UCLA-A1", "UCLA-A2", "UCLA-A3") if c in by]
        # En el subset corto solo viene A1: escalar a rango 3-15 (x3) para el umbral.
        soledad = soledad_items[0] * 3 if len(soledad_items) == 1 else sum(soledad_items)

        intima = avg([float(by[c]) for c in ("CAC-B1", "CAC-B2") if c in by])
        relacional = avg([float(by[c]) for c in ("CAC-B3", "CAC-B4") if c in by])
        colectiva = float(by["CAC-B5"]) if "CAC-B5" in by else 0.0
        strong_dims = sum(1 for d in (intima, relacional, colectiva) if d >= 4.0)

        requires_confirmation = False
        if soledad >= 10:
            state = "N1"
        elif soledad >= 6:
            state = "N2"
        elif soledad <= 5 and strong_dims >= 2:
            state = "N3"
            requires_confirmation = True  # candidato a N4 (Generativo)
        else:
            state = "N2"

        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=state,
            state_label=LABELS[state],
            sub_scores={
                "soledad": round(soledad, 1),
                "intima": round(intima, 2),
                "relacional": round(relacional, 2),
                "colectiva": round(colectiva, 2),
            },
            requires_user_confirmation=requires_confirmation,
            suggested_next_step=NEXT[state],
        )
