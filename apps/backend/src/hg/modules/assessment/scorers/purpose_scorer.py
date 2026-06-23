"""P2 · MLQ-10 — Presencia vs Búsqueda → 4 estados Damon."""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput, avg

THRESHOLD = 5.0

STATES = {
    "Latente": "Activar la búsqueda: preguntas reflexivas, modelos inspiradores.",
    "Explorador": "Comprometerse con una dirección: reducir opciones, profundizar.",
    "Direccionado": "Cerrar brecha intención-acción; orientar propósito más allá del ego.",
    "Integrado": "Mantenerlo flexible: revisión periódica, equilibrio con otros pilares.",
}
LABELS = {
    "Latente": "No siente propósito y no lo está buscando.",
    "Explorador": "Búsqueda activa sin ancla sostenida. Estado sano.",
    "Direccionado": "Tiene norte pero le falta acción concreta o trascendencia.",
    "Integrado": "Vive su propósito con compromiso real y orientación trascendente.",
}


class PurposeScorer(BaseScorer):
    pillar_code = PillarCode.P2

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        # short subset puede traer solo MLQ-1 (presencia) y MLQ-8 (búsqueda).
        presencia_items = [by[c] for c in ("MLQ-1", "MLQ-2", "MLQ-3", "MLQ-4") if c in by]
        if "MLQ-5" in by:
            presencia_items.append(8 - by["MLQ-5"])  # invertido
        busqueda_items = [by[c] for c in ("MLQ-6", "MLQ-7", "MLQ-8", "MLQ-9", "MLQ-10") if c in by]
        presencia = avg([float(v) for v in presencia_items])
        busqueda = avg([float(v) for v in busqueda_items])

        pres_high = presencia >= THRESHOLD
        busq_high = busqueda >= THRESHOLD
        if pres_high and busq_high:
            state = "Direccionado"
        elif pres_high and not busq_high:
            state = "Integrado"
        elif not pres_high and busq_high:
            state = "Explorador"
        else:
            state = "Latente"

        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=state,
            state_label=LABELS[state],
            sub_scores={"presencia": round(presencia, 2), "busqueda": round(busqueda, 2)},
            suggested_next_step=STATES[state],
        )
