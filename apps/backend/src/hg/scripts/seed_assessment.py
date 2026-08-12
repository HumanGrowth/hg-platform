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
from hg.modules.assessment.enums import InstrumentCode, PillarCode, ResponseType
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
    (InstrumentCode.PMM_V3, "PMM v3 — Marco de competencias de carrera", PillarCode.P1,
     "5 competencias (C1..C5) × 6 niveles (L1..L6). Estado = weakest link (MIN).", "Human Growth (Marco Teórico)"),
    (InstrumentCode.MLQ_10, "MLQ-10 — Meaning in Life Questionnaire", PillarCode.P2,
     "Presencia + Búsqueda de significado. 4 estados Damon.", "Michael F. Steger"),
    (InstrumentCode.UCLA_3, "UCLA Loneliness Scale (3-item)", PillarCode.P3,
     "Soledad percibida (A1-A3).", "Hughes / Cacioppo"),
    (InstrumentCode.CACIOPPO_5, "Dimensiones de conexión (Cacioppo)", PillarCode.P3,
     "Íntima / Relacional / Colectiva (B1-B5).", "John Cacioppo"),
    (InstrumentCode.PROCHASKA, "Modelo Transteórico × 4 dominios", PillarCode.P4,
     "Sueño / Actividad / Nutrición / Recuperación. Estados E1-E5 + recaída.", "Prochaska & DiClemente"),
    (InstrumentCode.ERQ_10, "ERQ — Emotion Regulation Questionnaire", PillarCode.P5,
     "Reevaluación (A1-A6) vs Supresión (A7-A10).", "James Gross"),
    (InstrumentCode.AAQ_II, "AAQ-II — flexibilidad psicológica (1 ítem)", PillarCode.P5,
     "Ítem de screening ACT (invertido).", "Steven Hayes"),
    (InstrumentCode.CD_RISC_10, "CD-RISC-10 — Connor-Davidson Resilience", PillarCode.P6A,
     "Resiliencia emocional (0-40). 3 niveles.", "Connor & Davidson"),
    (InstrumentCode.CFPB_5, "CFPB-5 — Bienestar financiero (adaptado CR)", PillarCode.P6B,
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
    ("PMM-C1", "C1", "¿Cómo describirías hoy tu capacidad de adaptarte a cambios y aprender cosas nuevas?", [
        "Me cuesta adaptarme a cambios. Aprendo cuando me lo piden explícitamente.",
        "Me adapto a cambios planeados. Busco aprender lo necesario para mi rol.",
        "Me adapto con autonomía. Aprendo proactivamente y aplico lo nuevo a mi trabajo.",
        "Ayudo a otros a adaptarse. Identifico oportunidades de aprendizaje para el equipo.",
        "Anticipo cambios sistémicos. Diseño caminos de aprendizaje para múltiples equipos.",
        "Lidero transformaciones organizacionales. La adaptabilidad es parte de la cultura que construyo.",
    ]),
    ("PMM-C2", "C2", "¿Cómo describirías hoy tu nivel de excelencia operativa y colaboración con tus pares?", [
        "Cumplo tareas con supervisión cercana. La calidad y los plazos dependen de que me los recuerden.",
        "Ejecuto mi trabajo con calidad estándar. Colaboro cuando me lo piden.",
        "Entrego con calidad consistente y autonomía. Colaboro de forma fluida con mi equipo.",
        "Elevo el estándar de calidad del equipo. Coordino la colaboración entre pares.",
        "Diseño procesos de excelencia para varios equipos. Articulo colaboración cross-funcional.",
        "Defino el estándar operativo de la organización. La colaboración efectiva es parte de la cultura que lidero.",
    ]),
    ("PMM-C3", "C3", "¿Cómo describirías hoy tu expertise técnico y tu pensamiento estratégico?", [
        "Tengo conocimientos básicos. Resuelvo problemas conocidos siguiendo instrucciones.",
        "Manejo bien mi área. Resuelvo problemas habituales por mi cuenta.",
        "Tengo expertise sólido. Tomo decisiones con visión del impacto en mi trabajo.",
        "Soy referente técnico. Conecto decisiones con la estrategia del área.",
        "Tengo visión sistémica. Decido bajo incertidumbre considerando múltiples áreas.",
        "Defino la dirección estratégica. Mi expertise moldea las decisiones de la organización.",
    ]),
    ("PMM-C4", "C4", "¿Cómo describirías hoy tu comunicación y tu capacidad de influir en otros?", [
        "Me cuesta expresar ideas con claridad. Comunico lo justo para cumplir mi tarea.",
        "Comunico con claridad en mi equipo. Transmito información de forma efectiva.",
        "Comunico con impacto y adapto el mensaje a mi audiencia. Influyo en decisiones de mi área.",
        "Articulo mensajes complejos. Influyo en stakeholders más allá de mi equipo.",
        "Comunico visión a gran escala. Influyo en decisiones de múltiples áreas.",
        "Mi comunicación moviliza a la organización. Soy una voz de referencia interna y externa.",
    ]),
    ("PMM-C5", "C5", "¿Cómo describirías hoy tu inteligencia emocional y social?", [
        "Me cuesta reconocer mis emociones y las de otros. Los conflictos me desbordan.",
        "Reconozco mis emociones básicas. Manejo relaciones cordiales en el día a día.",
        "Tengo buena auto-conciencia y empatía. Manejo conflictos de forma constructiva.",
        "Leo bien la dinámica del equipo. Ayudo a otros a resolver sus conflictos.",
        "Modelo la cultura emocional de varios equipos. Anticipo y prevengo tensiones sistémicas.",
        "Cultivo la seguridad psicológica de la organización. La inteligencia social es parte del liderazgo que ejerzo.",
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
    ("MLQ-3", "Presencia", False, False, "Sé qué es lo que hace que mi vida valga la pena."),
    ("MLQ-4", "Presencia", False, False, "He encontrado un propósito de vida que realmente me llena."),
    ("MLQ-5", "Presencia", True, False, "Siento que mi vida no tiene un rumbo claro."),
    ("MLQ-6", "Búsqueda", False, False, "Ando buscando algo que le dé más sentido a mi vida."),
    ("MLQ-7", "Búsqueda", False, False, "Constantemente me pregunto cuál es mi propósito en la vida."),
    ("MLQ-8", "Búsqueda", False, True, "Sigo buscando algo que le dé dirección a mi vida."),
    ("MLQ-9", "Búsqueda", False, False, "Estoy en busca de una misión o propósito que sea mío."),
    ("MLQ-10", "Búsqueda", False, False, "Siento que todavía estoy buscando el significado de mi vida."),
]


def _mlq() -> list[tuple]:
    return [
        (code, sub, None, L17, 1, 7, rev, short, i + 1, prompt, None)
        for i, (code, sub, rev, short, prompt) in enumerate(MLQ)
    ]


# P3 · UCLA-3 (A1-A3, escala 1-5) + Cacioppo (B1-B5, escala 1-5). Short: A1, B1.
UCLA = [
    ("UCLA-A1", "Soledad", True, "¿Qué tan seguido sentís que te hace falta compañía?"),
    ("UCLA-A2", "Soledad", False, "¿Qué tan seguido sentís que andás solo/a, aunque estés rodeado/a de gente?"),
    ("UCLA-A3", "Soledad", False, "¿Qué tan seguido sentís que no tenés con quién hablar de verdad?"),
]
CACIOPPO = [
    ("CAC-B1", "Íntima", True, "Tengo al menos una persona con quien puedo hablar abiertamente de lo que me preocupa."),
    ("CAC-B2", "Íntima", False, "Cuando me pasa algo importante —bueno o malo— sé exactamente a quién llamar primero."),
    ("CAC-B3", "Relacional", False, "Tengo un grupo de amigos o familiares con quienes me veo o hablo con regularidad."),
    ("CAC-B4", "Relacional", False, "Si necesito una mano con algo, sé a quién pedirle ayuda."),
    ("CAC-B5", "Colectiva", False, "Me siento parte de algún grupo o comunidad que me importa."),
]


def _ucla() -> list[tuple]:
    return [(c, s, None, L15, 1, 5, False, short, i + 1, p, None)
            for i, (c, s, short, p) in enumerate(UCLA)]


def _cacioppo() -> list[tuple]:
    return [(c, s, None, L15, 1, 5, False, short, i + 1, p, None)
            for i, (c, s, short, p) in enumerate(CACIOPPO)]


# P4 · Prochaska × 4 dominios. a=conductual (numérico), b=intención (E1-E5). Short: *b.
PROCHASKA_STAGES = [
    ("No lo veo como un problema, estoy bien así.", 1, "E1"),
    ("A veces pienso que debería cambiar, pero no sé si es para tanto.", 2, "E2"),
    ("Quiero cambiar y ya tengo idea de cómo empezar.", 3, "E3"),
    ("Ya empecé a hacer cambios hace menos de 6 meses.", 4, "E4"),
    ("Llevo más de 6 meses con el cambio, ya es parte de mi rutina.", 5, "E5"),
]
# (code, domain, prompt, [behavioral option labels])
PROCHASKA_A = [
    ("PRO-1a", "Sueño", "En los últimos 30 días, ¿cuántas noches dormiste al menos 7 horas seguidas?",
     ["0–5 noches", "6–10 noches", "11–15 noches", "16–20 noches", "Más de 20 noches"]),
    ("PRO-2a", "Actividad", "En la última semana, ¿cuántos días hiciste al menos 30 minutos de actividad física moderada?",
     ["0 días", "1–2 días", "3–4 días", "5–6 días", "Todos los días"]),
    ("PRO-3a", "Nutrición", "En un día típico, ¿cuántas porciones de frutas y verduras comés aproximadamente?",
     ["0–1 porciones", "2 porciones", "3 porciones", "4 porciones", "5 o más porciones"]),
    ("PRO-4a", "Recuperación", "En la última semana, ¿cuántos días lograste desconectarte completamente del trabajo por al menos 30 minutos?",
     ["0 días", "1–2 días", "3–4 días", "5–6 días", "Todos los días"]),
]
PROCHASKA_B = [
    ("PRO-1b", "Sueño", "Cuando pensás en tu sueño, ¿cuál de estas te describe mejor?"),
    ("PRO-2b", "Actividad", "Cuando pensás en hacer ejercicio de forma regular, ¿cuál te describe mejor?"),
    ("PRO-3b", "Nutrición", "Cuando pensás en cómo te alimentás, ¿cuál te describe mejor?"),
    ("PRO-4b", "Recuperación", "Cuando pensás en tu capacidad de desconectarte y recuperarte, ¿cuál te describe mejor?"),
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
    ("ERQ-A1", "Reevaluación", True, "Cuando quiero sentirme mejor, cambio la forma en que pienso sobre lo que está pasando."),
    ("ERQ-A2", "Reevaluación", False, "Cuando quiero salir de un estado negativo, le busco otro ángulo a la situación."),
    ("ERQ-A3", "Reevaluación", False, "Cuando algo me estresa, trato de pensar diferente para mantener la calma."),
    ("ERQ-A4", "Reevaluación", False, "Cuando quiero ponerme de mejor humor, cambio cómo estoy viendo la situación."),
    ("ERQ-A5", "Reevaluación", False, "Manejo mis emociones reinterpretando lo que me pasa."),
    ("ERQ-A6", "Reevaluación", False, "Cuando quiero reducir lo que siento negativamente, cambio cómo pienso en eso."),
    ("ERQ-A7", "Supresión", True, "Me guardo lo que siento para mí."),
    ("ERQ-A8", "Supresión", False, "Aunque sienta emociones positivas, tengo cuidado de no mostrarlas."),
    ("ERQ-A9", "Supresión", False, "Controlo lo que siento no dejándolo salir."),
    ("ERQ-A10", "Supresión", False, "Cuando siento emociones difíciles, me aseguro de no expresarlas."),
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
    "Le busco el lado chistoso o liviano a los problemas.",
    "Salir adelante en situaciones difíciles me hace más fuerte.",
    "Me recupero rápido después de una enfermedad o un golpe de la vida.",
    "Creo que puedo llegar a mis metas aunque se presenten obstáculos en el camino.",
    "Bajo presión, me mantengo enfocado/a y pienso con claridad.",
    "Un fracaso no me quita las ganas de seguir.",
    "Me considero una persona con temple cuando las cosas se ponen difíciles.",
    "Puedo lidiar con emociones complicadas como la tristeza, el miedo o el enojo.",
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
         "Si hoy perdiera mi fuente de ingresos principal, ¿por cuánto tiempo podría sostener mis gastos sin endeudarme?", b1_opts),
        ("CFPB-B2", "Finanzas", None, L15, 1, 5, False, False, 2,
         "Estoy tranquilo/a con la seguridad económica que tengo para el futuro.", None),
        ("CFPB-B3", "Finanzas", None, L15, 1, 5, False, False, 3,
         "Tengo dinero suficiente para cubrir lo que necesito mes a mes.", None),
        ("CFPB-B4", "Finanzas", None, L15, 1, 5, True, False, 4,
         "Siento que mis finanzas controlan mi vida.", None),
        ("CFPB-B5", "Finanzas", None, MC, 0, 4, False, False, 5,
         "Si se me presentara un gasto inesperado de ₡500.000, podría cubrirlo sin endeudarme.", b5_opts),
    ]


ITEMS_BY_INSTRUMENT = {
    InstrumentCode.PMM_V3: (PillarCode.P1, _pmm()),
    InstrumentCode.MLQ_10: (PillarCode.P2, _mlq()),
    InstrumentCode.UCLA_3: (PillarCode.P3, _ucla()),
    InstrumentCode.CACIOPPO_5: (PillarCode.P3, _cacioppo()),
    InstrumentCode.PROCHASKA: (PillarCode.P4, _prochaska()),
    InstrumentCode.ERQ_10: (PillarCode.P5, _erq()),
    InstrumentCode.AAQ_II: (PillarCode.P5, _aaq()),
    InstrumentCode.CD_RISC_10: (PillarCode.P6A, _risc()),
    InstrumentCode.CFPB_5: (PillarCode.P6B, _cfpb()),
}


def seed(db: Session) -> dict[str, int]:
    inst_n = item_n = opt_n = 0
    for code, name, pillar, desc, author in INSTRUMENTS:
        inst = db.scalar(select(AssessmentInstrument).where(AssessmentInstrument.code == code))
        if inst is None:
            inst = AssessmentInstrument(code=code, name=name, pillar_code=pillar)
            db.add(inst)
            inst_n += 1
        inst.name = name
        inst.pillar_code = pillar
        inst.description = desc
        inst.author = author
        db.flush()

        _pillar, items = ITEMS_BY_INSTRUMENT[code]
        for (item_code, sub_scale, sub_domain, rtype, smin, smax,
             rev, short, order, prompt, options) in items:
            item = db.scalar(select(AssessmentItem).where(AssessmentItem.item_code == item_code))
            if item is None:
                item = AssessmentItem(item_code=item_code, instrument_id=inst.id, pillar_code=_pillar)
                db.add(item)
                item_n += 1
            item.instrument_id = inst.id
            item.pillar_code = _pillar
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
