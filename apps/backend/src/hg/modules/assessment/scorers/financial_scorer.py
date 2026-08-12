"""P6B · CFPB-5 — bienestar financiero (0-23) → 3 niveles. B4 invertido."""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput

NEXT = {
    "Frágil": "Fundamentos: presupuesto básico + fondo de emergencia de 1 mes.",
    "Vulnerable": "Crecer con tu dinero: ahorro 3-6 meses + primer plan de inversión.",
    "Estable": "Sostener y optimizar: diversificación, planificación a largo plazo.",
}
LABELS = {
    "Frágil": "Sin colchón ni capacidad de manejar imprevistos.",
    "Vulnerable": "Cubre lo básico pero sin margen ante imprevistos.",
    "Estable": "Cubre necesidades, tiene colchón y proyecta seguridad a futuro.",
}


class FinancialScorer(BaseScorer):
    pillar_code = PillarCode.P6B

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        b1 = by.get("CFPB-B1", 0)
        b2 = by.get("CFPB-B2", 0)
        b3 = by.get("CFPB-B3", 0)
        b4 = (6 - by["CFPB-B4"]) if "CFPB-B4" in by else 0  # invertido
        b5 = by.get("CFPB-B5", 0)
        total = b1 + b2 + b3 + b4 + b5

        if "CFPB-B1" in by and len(by) == 1:
            # Subset corto: solo B1 (colchón de emergencia 0-4). Mapear directo.
            state = "Frágil" if b1 <= 1 else ("Vulnerable" if b1 <= 2 else "Estable")
        elif total < 9:
            state = "Frágil"
        elif total <= 14:
            state = "Vulnerable"
        else:
            state = "Estable"

        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=state,
            state_label=LABELS[state],
            sub_scores={"total": total},
            suggested_next_step=NEXT[state],
        )
