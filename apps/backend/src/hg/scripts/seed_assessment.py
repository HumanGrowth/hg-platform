"""Seed del motor de assessment: 9 instrumentos + 57 items + opciones.

Items P2-P6 transcritos literal del doc firmado HG_Evaluacion_Pilares.pdf.
Items P1 (PMM v3) compuestos según el Marco Teórico (5 competencias × 6 niveles).
Idempotente: upsert de instrumentos por ``code`` y de items por ``item_code``;
las opciones se reescriben por item. Re-ejecutable (segunda corrida = 0 cambios).

Corre como ``hg`` (superusuario dev → BYPASSRLS). El catálogo no tiene RLS.
"""
from __future__ import annotations

import logging

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.assessment.enums import DimensionCode, InstrumentCode, ResponseType
from hg.modules.assessment.models import (
    AssessmentInstrument,
    AssessmentItem,
    AssessmentItemOption,
)

log = logging.getLogger("hg.seed_assessment")

L17 = ResponseType.likert_1_7
L15 = ResponseType.likert_1_5
L04 = ResponseType.likert_0_4
MC = ResponseType.multiple_choice

# ─────────────────────────── Instrumentos ───────────────────────────

INSTRUMENTS = [
    (InstrumentCode.PMM_V3, "PMM v3 — Marco de competencias de carrera", DimensionCode.P1,
     "5 competencias (C1..C5) × 6 niveles (L1..L6). Estado = weakest link (MIN).", "Human Growth (Marco Teórico)"),
    (InstrumentCode.MLQ_10, "MLQ-10 — Meaning in Life Questionnaire", DimensionCode.P2,
     "Presencia + Búsqueda de significado. 4 estados Damon.", "Michael F. Steger"),
    (InstrumentCode.UCLA_3, "UCLA Loneliness Scale (3-item)", DimensionCode.P3,
     "Soledad percibida (A1-A3).", "Hughes / Cacioppo"),
    (InstrumentCode.CACIOPPO_5, "Dimensiones de conexión (Cacioppo)", DimensionCode.P3,
     "Íntima / Relacional / Colectiva (B1-B5).", "John Cacioppo"),
    (InstrumentCode.PROCHASKA, "Modelo Transteórico × 4 dominios", DimensionCode.P4,
     "Sueño / Actividad / Nutrición / Recuperación. Estados E1-E5 + recaída.", "Prochaska & DiClemente"),
    (InstrumentCode.ERQ_10, "ERQ — Emotion Regulation Questionnaire", DimensionCode.P5,
     "Reevaluación (A1-A6) vs Supresión (A7-A10).", "James Gross"),
    (InstrumentCode.AAQ_II, "AAQ-II — flexibilidad psicológica (1 ítem)", DimensionCode.P5,
     "Ítem de screening ACT (invertido).", "Steven Hayes"),
    (InstrumentCode.CD_RISC_10, "CD-RISC-10 — Connor-Davidson Resilience", DimensionCode.P6A,
     "Resiliencia emocional (0-40). 3 niveles.", "Connor & Davidson"),
    (InstrumentCode.CFPB_5, "CFPB-5 — Bienestar financiero (adaptado CR)", DimensionCode.P6B,
     "Estabilidad financiera (0-23). 3 niveles.", "Consumer Financial Protection Bureau"),
]

# ─────────────────────────── Items ───────────────────────────
# Cada item: (item_code, sub_scale, sub_domain, response_type, scale_min, scale_max,
#             reverse_scored, short_subset, order_index, prompt, options)
# options: lista de (label, value, state_mapped) o None.

# P1 · PMM v3 (compuesto). 6 opciones L1..L6 por competencia.
def _pmm_options(levels: list[str]) -> list[tuple[str, int, str]]:
    return [(text, i + 1, f"L{i + 1}") for i, text in enumerate(levels)]


PMM_ITEMS = [
    ("PMM-C1", "C1", "¿Cómo te adaptás a los cambios y aprendés cosas nuevas?", [
        "Me cuesta adaptarme. Aprendo cuando me lo piden.",
        "Me adapto a cambios planeados. Aprendo lo necesario para mi rol.",
        "Me adapto con autonomía. Aprendo por iniciativa y lo aplico.",
        "Ayudo a otros a adaptarse. Detecto aprendizajes para el equipo.",
        "Anticipo cambios sistémicos. Diseño aprendizaje para varios equipos.",
        "Lidero transformaciones. La adaptabilidad es parte de la cultura que construyo.",
    ]),
    ("PMM-C2", "C2", "¿Cómo es hoy tu calidad de trabajo y tu colaboración con pares?", [
        "Cumplo tareas con supervisión cercana. Calidad y plazos dependen de recordatorios.",
        "Trabajo con calidad estándar. Colaboro cuando me lo piden.",
        "Entrego con calidad y autonomía. Colaboro con fluidez.",
        "Elevo el estándar del equipo. Coordino la colaboración entre pares.",
        "Diseño procesos de excelencia para varios equipos. Articulo la colaboración entre áreas.",
        "Defino el estándar operativo de la organización. Lidero una cultura de colaboración.",
    ]),
    ("PMM-C3", "C3", "¿Cómo es hoy tu expertise técnico y tu visión estratégica?", [
        "Tengo conocimientos básicos. Resuelvo problemas conocidos con instrucciones.",
        "Manejo bien mi área. Resuelvo lo habitual por mi cuenta.",
        "Tengo expertise sólido. Decido viendo el impacto en mi trabajo.",
        "Soy referente técnico. Conecto decisiones con la estrategia del área.",
        "Tengo visión sistémica. Decido con incertidumbre considerando varias áreas.",
        "Defino la dirección estratégica. Mi expertise orienta a la organización.",
    ]),
    ("PMM-C4", "C4", "¿Cómo es hoy tu comunicación y tu capacidad de influir?", [
        "Me cuesta expresar ideas con claridad. Comunico lo justo.",
        "Comunico con claridad en mi equipo.",
        "Comunico con impacto y adapto el mensaje. Influyo en decisiones de mi área.",
        "Articulo mensajes complejos. Influyo más allá de mi equipo.",
        "Comunico visión a gran escala. Influyo en decisiones de varias áreas.",
        "Mi comunicación moviliza a la organización. Soy voz de referencia.",
    ]),
    ("PMM-C5", "C5", "¿Cómo es hoy tu inteligencia emocional y social?", [
        "Me cuesta reconocer emociones, mías y ajenas. Los conflictos me desbordan.",
        "Reconozco mis emociones básicas. Mantengo relaciones cordiales.",
        "Tengo autoconciencia y empatía. Manejo conflictos de forma constructiva.",
        "Leo la dinámica del equipo. Ayudo a otros a resolver conflictos.",
        "Modelo la cultura emocional de varios equipos. Prevengo tensiones sistémicas.",
        "Cultivo la seguridad psicológica de la organización. Lidero con inteligencia social.",
    ]),
]


def _pmm() -> list[tuple]:
    out = []
    for idx, (code, sub, prompt, levels) in enumerate(PMM_ITEMS):
        out.append((code, sub, None, MC, 1, 6, False, True, idx + 1, prompt, _pmm_options(levels)))
    return out


# P2 · MLQ-10 (literal). Escala 1-7. Item 5 invertido. Short: 1, 8.
MLQ = [
    ("MLQ-1", "Presencia", False, True, "Siento que mi vida tiene sentido."),
    ("MLQ-2", "Presencia", False, False, "Tengo claro para qué estoy en este mundo."),
    ("MLQ-3", "Presencia", False, False, "Sé qué hace que mi vida valga la pena."),
    ("MLQ-4", "Presencia", False, False, "He encontrado un propósito de vida que me llena."),
    ("MLQ-5", "Presencia", True, False, "Siento que mi vida no tiene rumbo claro."),
    ("MLQ-6", "Búsqueda", False, False, "Busco algo que dé más sentido a mi vida."),
    ("MLQ-7", "Búsqueda", False, False, "Me pregunto seguido cuál es mi propósito."),
    ("MLQ-8", "Búsqueda", False, True, "Busco algo que dé dirección a mi vida."),
    ("MLQ-9", "Búsqueda", False, False, "Busco una misión o propósito propio."),
    ("MLQ-10", "Búsqueda", False, False, "Aún busco el significado de mi vida."),
]


def _mlq() -> list[tuple]:
    return [
        (code, sub, None, L17, 1, 7, rev, short, i + 1, prompt, None)
        for i, (code, sub, rev, short, prompt) in enumerate(MLQ)
    ]


# P3 · UCLA-3 (A1-A3, escala 1-5) + Cacioppo (B1-B5, escala 1-5). Short: A1, B1.
UCLA = [
    ("UCLA-A1", "Soledad", True, "¿Con qué frecuencia sentís que te falta compañía?"),
    ("UCLA-A2", "Soledad", False, "¿Con qué frecuencia sentís soledad, incluso estando entre gente?"),
    ("UCLA-A3", "Soledad", False, "¿Con qué frecuencia sentís que no tenés con quién hablar de verdad?"),
]
CACIOPPO = [
    ("CAC-B1", "Íntima", True, "Tengo al menos a alguien con quien hablar abiertamente de lo que me preocupa."),
    ("CAC-B2", "Íntima", False, "Cuando me pasa algo importante, sé a quién llamar primero."),
    ("CAC-B3", "Relacional", False, "Tengo amigos o familiares con quienes hablo o me veo con regularidad."),
    ("CAC-B4", "Relacional", False, "Si necesito ayuda, sé a quién pedírsela."),
    ("CAC-B5", "Colectiva", False, "Me siento parte de una comunidad que me importa."),
]


def _ucla() -> list[tuple]:
    return [(c, s, None, L15, 1, 5, False, short, i + 1, p, None)
            for i, (c, s, short, p) in enumerate(UCLA)]


def _cacioppo() -> list[tuple]:
    return [(c, s, None, L15, 1, 5, False, short, i + 1, p, None)
            for i, (c, s, short, p) in enumerate(CACIOPPO)]


# P4 · Prochaska × 4 dominios. a=conductual (numérico), b=intención (E1-E5). Short: *b.
PROCHASKA_STAGES = [
    ("No lo veo como problema; estoy bien así.", 1, "E1"),
    ("A veces pienso que debería cambiar, pero dudo que importe tanto.", 2, "E2"),
    ("Quiero cambiar y sé cómo empezar.", 3, "E3"),
    ("Empecé a cambiar hace menos de 6 meses.", 4, "E4"),
    ("Llevo más de 6 meses con el cambio; ya es rutina.", 5, "E5"),
]
# (code, domain, prompt, [behavioral option labels])
PROCHASKA_A = [
    ("PRO-1a", "Sueño", "En los últimos 30 días, ¿cuántas noches dormiste 7 horas seguidas o más?",
     ["0–5 noches", "6–10 noches", "11–15 noches", "16–20 noches", "Más de 20 noches"]),
    ("PRO-2a", "Actividad", "En la última semana, ¿cuántos días hiciste 30 minutos o más de actividad física moderada?",
     ["0 días", "1–2 días", "3–4 días", "5–6 días", "Todos los días"]),
    ("PRO-3a", "Nutrición", "En un día típico, ¿cuántas porciones de frutas y verduras comés?",
     ["0–1 porciones", "2 porciones", "3 porciones", "4 porciones", "5 o más porciones"]),
    ("PRO-4a", "Recuperación", "En la última semana, ¿cuántos días te desconectaste del trabajo por 30 minutos o más?",
     ["0 días", "1–2 días", "3–4 días", "5–6 días", "Todos los días"]),
]
PROCHASKA_B = [
    ("PRO-1b", "Sueño", "Sobre tu sueño, ¿cuál opción te describe mejor?"),
    ("PRO-2b", "Actividad", "Sobre hacer ejercicio con regularidad, ¿cuál opción te describe mejor?"),
    ("PRO-3b", "Nutrición", "Sobre tu alimentación, ¿cuál opción te describe mejor?"),
    ("PRO-4b", "Recuperación", "Sobre tu capacidad de desconectarte y recuperarte, ¿cuál opción te describe mejor?"),
]


def _prochaska() -> list[tuple]:
    out = []
    order = 1
    for (ca, dom, pa, labels), (cb, _dom, pb) in zip(PROCHASKA_A, PROCHASKA_B, strict=True):
        a_opts = [(lab, i, None) for i, lab in enumerate(labels)]  # value 0..4
        out.append((ca, "Conductual", dom, MC, 0, 4, False, False, order, pa, a_opts))
        order += 1
        b_opts = [(lab, v, st) for lab, v, st in PROCHASKA_STAGES]
        out.append((cb, "Intención", dom, MC, 1, 5, False, True, order, pb, b_opts))
        order += 1
    return out


# P5 · ERQ-10 (A1-A10, 1-7) + AAQ-II (B1, invertido). Short: A1, A7.
ERQ = [
    ("ERQ-A1", "Reevaluación", True, "Para sentirme mejor, cambio mi forma de pensar sobre lo que pasa."),
    ("ERQ-A2", "Reevaluación", False, "Para salir de un estado negativo, busco otro ángulo de la situación."),
    ("ERQ-A3", "Reevaluación", False, "Cuando algo me estresa, pienso distinto para mantener la calma."),
    ("ERQ-A4", "Reevaluación", False, "Para mejorar mi ánimo, cambio cómo veo la situación."),
    ("ERQ-A5", "Reevaluación", False, "Manejo mis emociones reinterpretando lo que me pasa."),
    ("ERQ-A6", "Reevaluación", False, "Para reducir una emoción negativa, cambio cómo pienso en ella."),
    ("ERQ-A7", "Supresión", True, "Me guardo lo que siento para mí."),
    ("ERQ-A8", "Supresión", False, "Aunque sienta emociones positivas, cuido de no mostrarlas."),
    ("ERQ-A9", "Supresión", False, "Controlo lo que siento no dejándolo salir."),
    ("ERQ-A10", "Supresión", False, "Ante emociones difíciles, me aseguro de no expresarlas."),
]


def _erq() -> list[tuple]:
    return [(c, s, None, L17, 1, 7, False, short, i + 1, p, None)
            for i, (c, s, short, p) in enumerate(ERQ)]


def _aaq() -> list[tuple]:
    return [("AAQ-B1", "Flexibilidad", None, L17, 1, 7, True, False, 1,
             "Mis emociones difíciles me impiden hacer lo que me importa.", None)]


# P6A · CD-RISC-10 (A1-A10, 0-4). Short: A1, A2.
RISC = [
    "Me adapto bien cuando las cosas cambian.",
    "Puedo manejar lo que se me venga encima.",
    "Encuentro el lado liviano de los problemas.",
    "Superar situaciones difíciles me hace más fuerte.",
    "Me recupero rápido de una enfermedad o un golpe de la vida.",
    "Creo que puedo lograr mis metas aunque haya obstáculos.",
    "Bajo presión, mantengo el enfoque y pienso con claridad.",
    "Un fracaso no me quita las ganas de seguir.",
    "Mantengo el temple cuando las cosas se ponen difíciles.",
    "Puedo lidiar con emociones como la tristeza, el miedo o el enojo.",
]


def _risc() -> list[tuple]:
    return [(f"RISC-A{i + 1}", "Resiliencia", None, L04, 0, 4, False, i < 2, i + 1, p, None)
            for i, p in enumerate(RISC)]


# P6B · CFPB-5. B1 (mc 0-4), B2/B3 (1-5), B4 (1-5 invertido), B5 (mc 0/2/4). Short: B1.
def _cfpb() -> list[tuple]:
    b1_opts = [
        ("No podría ni un mes", 0, None), ("Alrededor de 1 mes", 1, None),
        ("Unos 3 meses", 2, None), ("Unos 6 meses", 3, None), ("12 meses o más", 4, None),
    ]
    b5_opts = [("No", 0, None), ("Parcialmente", 2, None), ("Sí", 4, None)]
    return [
        ("CFPB-B1", "Finanzas", None, MC, 0, 4, False, True, 1,
         "Si hoy perdieras tu ingreso principal, ¿por cuánto tiempo podrías cubrir tus gastos sin endeudarte?", b1_opts),
        ("CFPB-B2", "Finanzas", None, L15, 1, 5, False, False, 2,
         "Siento tranquilidad con mi seguridad económica a futuro.", None),
        ("CFPB-B3", "Finanzas", None, L15, 1, 5, False, False, 3,
         "Tengo dinero suficiente para cubrir lo que necesito cada mes.", None),
        ("CFPB-B4", "Finanzas", None, L15, 1, 5, True, False, 4,
         "Siento que mis finanzas controlan mi vida.", None),
        ("CFPB-B5", "Finanzas", None, MC, 0, 4, False, False, 5,
         "Podría cubrir un gasto inesperado de ₡500.000 sin endeudarme.", b5_opts),
    ]


ITEMS_BY_INSTRUMENT = {
    InstrumentCode.PMM_V3: (DimensionCode.P1, _pmm()),
    InstrumentCode.MLQ_10: (DimensionCode.P2, _mlq()),
    InstrumentCode.UCLA_3: (DimensionCode.P3, _ucla()),
    InstrumentCode.CACIOPPO_5: (DimensionCode.P3, _cacioppo()),
    InstrumentCode.PROCHASKA: (DimensionCode.P4, _prochaska()),
    InstrumentCode.ERQ_10: (DimensionCode.P5, _erq()),
    InstrumentCode.AAQ_II: (DimensionCode.P5, _aaq()),
    InstrumentCode.CD_RISC_10: (DimensionCode.P6A, _risc()),
    InstrumentCode.CFPB_5: (DimensionCode.P6B, _cfpb()),
}


def seed(db: Session) -> dict[str, int]:
    inst_n = item_n = opt_n = 0
    for code, name, dimension, desc, author in INSTRUMENTS:
        inst = db.scalar(select(AssessmentInstrument).where(AssessmentInstrument.code == code))
        if inst is None:
            inst = AssessmentInstrument(code=code, name=name, dimension_code=dimension)
            db.add(inst)
            inst_n += 1
        inst.name = name
        inst.dimension_code = dimension
        inst.description = desc
        inst.author = author
        db.flush()

        _dimension, items = ITEMS_BY_INSTRUMENT[code]
        for (item_code, sub_scale, sub_domain, rtype, smin, smax,
             rev, short, order, prompt, options) in items:
            item = db.scalar(select(AssessmentItem).where(AssessmentItem.item_code == item_code))
            if item is None:
                item = AssessmentItem(item_code=item_code, instrument_id=inst.id, dimension_code=_dimension)
                db.add(item)
                item_n += 1
            item.instrument_id = inst.id
            item.dimension_code = _dimension
            item.sub_scale = sub_scale
            item.sub_domain = sub_domain
            item.response_type = rtype
            item.scale_min = smin
            item.scale_max = smax
            item.reverse_scored = rev
            item.short_subset = short
            item.order_index = order
            item.prompt = prompt
            item.is_active = True
            db.flush()

            db.execute(delete(AssessmentItemOption).where(AssessmentItemOption.item_id == item.id))
            if options:
                for oidx, (label, value, state_mapped) in enumerate(options):
                    db.add(AssessmentItemOption(
                        item_id=item.id, order_index=oidx, label=label,
                        value=value, state_mapped=state_mapped,
                    ))
                    opt_n += 1
    db.commit()
    return {"instruments": inst_n, "items": item_n, "options": opt_n}


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    db = SessionLocal()
    try:
        stats = seed(db)
        log.info("seed_assessment: %s", stats)
        print(
            f"{stats['instruments']} instruments inserted, "
            f"{stats['items']} items inserted, {stats['options']} options inserted."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
