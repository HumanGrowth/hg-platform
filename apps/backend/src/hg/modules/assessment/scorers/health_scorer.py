"""P4 · Prochaska x 4 dominios — estado por dominio + alerta de recaída.

Cada dominio: el item *b (intención) da el estado E1-E5; si E5, se verifica el
item *a (conductual) contra el umbral. Si la conducta no respalda → recaída en
ese dominio. Estado general = MIN de los 4. Recaída general = cualquier dominio.
"""
from __future__ import annotations

from hg.modules.assessment.enums import PillarCode
from hg.modules.assessment.scorers.base import BaseScorer, ScoringInput, ScoringOutput

# (key, b_code, a_code, umbral_conductual_min) — value del item *a (0..4).
DOMAINS = [
    ("sueno", "PRO-1b", "PRO-1a", 3),       # ≥20 noches → "16-20"(3) o "Más de 20"(4)
    ("actividad", "PRO-2b", "PRO-2a", 3),   # ≥4 días → "5-6"(3) o "Todos"(4)
    ("nutricion", "PRO-3b", "PRO-3a", 4),   # ≥5 porciones → "5 o más"(4)
    ("recuperacion", "PRO-4b", "PRO-4a", 3),  # ≥4 días → "5-6"(3) o "Todos"(4)
]
STAGE_LABEL = {
    1: "Precontemplación", 2: "Contemplación", 3: "Preparación",
    4: "Acción", 5: "Mantenimiento",
}
STAGE_NEXT = {
    1: "Elevar conciencia sobre este dominio.",
    2: "Resolver la ambivalencia: ¿qué ganás si cambiás?",
    3: "Tiny habits: empezá con el paso más chico posible.",
    4: "Sostené la motivación autónoma; aún no está consolidado.",
    5: "Hábito integrado: mantenelo.",
}


class HealthScorer(BaseScorer):
    pillar_code = PillarCode.P4

    def score(self, inp: ScoringInput) -> ScoringOutput:
        by = inp.by_code
        sub_scores: dict = {}
        recaida_any = False
        stages: list[int] = []
        for key, b_code, a_code, threshold in DOMAINS:
            if b_code not in by:
                continue
            stage = int(by[b_code])  # 1..5 = E1..E5
            recaida = False
            if stage == 5 and a_code in by and by[a_code] < threshold:
                recaida = True
                recaida_any = True
            sub_scores[key] = {"stage": f"E{stage}", "recaida": recaida}
            stages.append(stage)

        general = min(stages) if stages else 1
        nxt = STAGE_NEXT[general]
        if recaida_any:
            nxt += " ⚠ La conducta no respalda algún hábito declarado — conversación recomendada."

        return ScoringOutput(
            pillar_code=self.pillar_code,
            state_code=f"E{general}",
            state_label=STAGE_LABEL[general],
            sub_scores=sub_scores,
            recaida_detected=recaida_any,
            suggested_next_step=nxt,
        )
