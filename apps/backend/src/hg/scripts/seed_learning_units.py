"""Seed de 3 Learning Units publicadas con copy placeholder (TASK A-09).

Una por pilar principal (P1 Carrera · P3 Relaciones · P4 Salud) con
estructura variada para testing — ver docs/prompts/claude-code_learning_units_v2_fase1.md.
Todo el texto real queda marcado ``[COPY PENDIENTE · coach]`` — Andrés
reemplaza con contenido validado post-merge. Los videos usan el placeholder
canónico ``dQw4w9WgXcQ``.

Reusa las funciones del admin router (``create_unit``/``create_block``/
``publish_unit``) en vez de duplicar la lógica de creación — son callables
Python normales (los ``Depends(...)`` son solo defaults; acá se les pasa la
sesión y un ``_`` de relleno directamente, sin pasar por HTTP/FastAPI DI).
Esto también implica que las 3 units seed pasan la MISMA validación de
publish que exige la API real.

Desviación del spec: la Unit 2 (P3, "Composición C") lista en el prompt 5
bloques *sin* `text_solution` — pero la validación de publish (A-05, mismo
prompt) exige al menos 1 `text_solution` referenciando una evidence de la
misma unit. Sin ese bloque la unit no podría publicarse nunca (viola el
criterio "3 units publicadas post-seed"), así que se le agregó un sexto
bloque `text_solution` acá.

Idempotente: si el slug ya existe, se borra la unit entera (CASCADE se lleva
sus bloques) y se recrea desde cero con el contenido actual del script — así
"correr 2x" no duplica, y además una tercera corrida después de editar los
placeholders de este archivo deja el contenido al día (no hace falta una
migración de datos para iterar el copy).
"""
from __future__ import annotations

import logging
from typing import cast

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.identity.models import User
from hg.modules.learning_units.admin_router import create_block, create_unit, publish_unit
from hg.modules.learning_units.models import LearningUnit
from hg.modules.learning_units.schemas import (
    LearningUnitCreate,
    QuizBlockCreate,
    QuizOptionCreate,
    QuizQuestionMultipleChoiceCreate,
    QuizQuestionSingleChoiceCreate,
    QuizQuestionTrueFalseCreate,
    ReflectionBlockCreate,
    TextBlockCreate,
    VideoBlockCreate,
)

log = logging.getLogger("hg.seed_learning_units")

PLACEHOLDER_VIDEO_ID = "dQw4w9WgXcQ"
PLACEHOLDER_VIDEO_URL = f"https://www.youtube.com/embed/{PLACEHOLDER_VIDEO_ID}"  # TASK lu-refine-A-04 reemplaza este script entero
PENDING = "[COPY PENDIENTE · coach]"

# Los endpoints admin exigen `_: User = Depends(require_role("superadmin"))`
# como parámetro de autorización; al llamarlos directo (bypass de FastAPI DI)
# no hay un User real en manos del script. `cast` en vez de `None` satisface
# mypy sin tocar la firma de admin_router.py — es un no-op en runtime.
_SEED_ACTOR = cast(User, None)


def _delete_if_exists(db: Session, slug: str) -> None:
    existing = db.scalar(select(LearningUnit).where(LearningUnit.slug == slug))
    if existing is not None:
        db.delete(existing)
        db.flush()


def _seed_unit_1_onboarding_remoto(db: Session) -> None:
    """P1 Carrera · Composición A clásica (7 bloques)."""
    slug = "p1-c3-l2-001-onboarding-remoto-placeholder"
    _delete_if_exists(db, slug)

    unit = create_unit(
        body=LearningUnitCreate(
            slug=slug,
            title=f"{PENDING} Onboarding remoto sin silencio",
            pillar_code="P1", competency_code="C3", level_code="L2",
            estimated_duration_seconds=95,
        ),
        db=db, _=_SEED_ACTOR,
    )

    create_block(unit.id, VideoBlockCreate(
        block_type="video_intro", position=1, video_url=PLACEHOLDER_VIDEO_URL, duration_seconds=12,
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, TextBlockCreate(
        block_type="text_context", position=2, variant="context", eyebrow="SITUACIÓN",
        body=(
            f"{PENDING} Cuando entrás a un canal nuevo y nadie te habla, empezás a preguntarte "
            "si escribiste mal, si tu pregunta era tonta, o si sos vos el problema. En una semana "
            "ya evitás escribir. En un mes evitás participar. En tres meses tenés una junta con RRHH."
        ),
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, VideoBlockCreate(
        block_type="video_teaching", position=3, video_url=PLACEHOLDER_VIDEO_URL, duration_seconds=30,
    ), db=db, _=_SEED_ACTOR)

    evidence = create_block(unit.id, TextBlockCreate(
        block_type="text_evidence", position=4, variant="evidence", eyebrow="EVIDENCIA",
        body=(
            f"{PENDING} Amy Edmondson (Harvard, 1999) mostró que los equipos con más seguridad "
            "psicológica reportan MÁS errores — no menos. La seguridad hace visible el aprendizaje, "
            "no lo elimina."
        ),
        citation={
            "text": f"{PENDING} Edmondson, ASQ (1999)", "source": "Amy Edmondson · Harvard Business School",
            "year": 1999, "doi_or_url": "https://doi.org/10.2307/2666999", "tier": "observational",
        },
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, TextBlockCreate(
        block_type="text_solution", position=5, variant="solution", eyebrow="PROBÁ ESTO",
        body=(
            f"{PENDING} Antes de escribir en un canal nuevo, agregá una línea de contexto: "
            "'Nueva por acá — trabajando en X, tengo una duda sobre Y'. Reduce la ambigüedad del "
            "pedido y baja la barrera para que alguien responda."
        ),
        applies_to=["P1", "P3"], requires_evidence_block_id=evidence.id,
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, QuizBlockCreate(
        block_type="quiz_recall", position=6, required=True,
        questions=[
            QuizQuestionSingleChoiceCreate(
                question_type="single_choice",
                prompt=(
                    f"{PENDING} ¿Cuál es el mecanismo central por el cual la seguridad psicológica "
                    "mejora el desempeño de un equipo?"
                ),
                options=[
                    QuizOptionCreate(
                        text=f"{PENDING} Reduce la ansiedad por evaluación y permite hacer visibles los errores",
                        is_correct=True,
                        explanation=f"{PENDING} Correcto — la visibilidad es lo que produce el aprendizaje.",
                    ),
                    QuizOptionCreate(
                        text=f"{PENDING} Aumenta la felicidad del equipo directamente",
                        is_correct=False,
                        explanation=f"{PENDING} No es el mecanismo central — es una consecuencia, no la causa.",
                    ),
                ],
            ),
            QuizQuestionSingleChoiceCreate(
                question_type="single_choice",
                prompt=f"{PENDING} ¿Qué reduce agregar una línea de contexto antes de un pedido?",
                options=[
                    QuizOptionCreate(
                        text=f"{PENDING} La ambigüedad del pedido, bajando la barrera para responder",
                        is_correct=True,
                        explanation=f"{PENDING} Correcto.",
                    ),
                    QuizOptionCreate(
                        text=f"{PENDING} El tiempo que tarda en escribirse el mensaje",
                        is_correct=False,
                        explanation=f"{PENDING} El efecto es sobre la respuesta, no sobre la redacción.",
                    ),
                ],
            ),
        ],
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, VideoBlockCreate(
        block_type="video_closing", position=7, video_url=PLACEHOLDER_VIDEO_URL, duration_seconds=10,
    ), db=db, _=_SEED_ACTOR)

    publish_unit(unit.id, db=db, _=_SEED_ACTOR)


def _seed_unit_2_feedback_directo(db: Session) -> None:
    """P3 Relaciones · Composición C de reflexión (6 bloques — ver desviación
    en el docstring del módulo: se sumó text_solution para poder publicar)."""
    slug = "p3-c4-l3-001-feedback-directo-placeholder"
    _delete_if_exists(db, slug)

    unit = create_unit(
        body=LearningUnitCreate(
            slug=slug,
            title=f"{PENDING} Feedback directo sin drama",
            pillar_code="P3", competency_code="C4", level_code="L3",
            estimated_duration_seconds=80,
        ),
        db=db, _=_SEED_ACTOR,
    )

    create_block(unit.id, VideoBlockCreate(
        block_type="video_intro", position=1, video_url=PLACEHOLDER_VIDEO_URL, duration_seconds=10,
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, TextBlockCreate(
        block_type="text_context", position=2, variant="context", eyebrow="SITUACIÓN",
        body=(
            f"{PENDING} Tenés feedback para dar pero lo postergás tres semanas porque no querés "
            "que la conversación se ponga incómoda. Cuando por fin lo decís, ya estás frustrado y "
            "sale mal."
        ),
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, VideoBlockCreate(
        block_type="video_teaching", position=3, video_url=PLACEHOLDER_VIDEO_URL, duration_seconds=25,
    ), db=db, _=_SEED_ACTOR)

    evidence = create_block(unit.id, TextBlockCreate(
        block_type="text_evidence", position=4, variant="evidence", eyebrow="EVIDENCIA",
        body=(
            f"{PENDING} Dato/estudio citable sobre feedback directo y demora — completar con fuente "
            "real post-merge."
        ),
        citation={
            "text": f"{PENDING} fuente a confirmar", "source": f"{PENDING}", "year": 2020,
            "doi_or_url": "https://example.org/placeholder-citation", "tier": "observational",
        },
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, TextBlockCreate(
        block_type="text_solution", position=5, variant="solution", eyebrow="PROBÁ ESTO",
        body=(
            f"{PENDING} Dentro de las 48h de observar algo, decilo en una frase concreta y "
            "específica — sin sandwich, sin rodeos."
        ),
        applies_to=["P3"], requires_evidence_block_id=evidence.id,
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, ReflectionBlockCreate(
        block_type="reflection_write", position=6, required=True,
        prompt=(
            f"{PENDING} Escribí en 2 frases una situación de tu trabajo esta semana donde podrías "
            "dar feedback directo en vez de postergarlo."
        ),
        min_chars=30, max_chars=500, example=f"{PENDING} ejemplo de formato esperado",
    ), db=db, _=_SEED_ACTOR)

    publish_unit(unit.id, db=db, _=_SEED_ACTOR)


def _seed_unit_3_micro_descansos(db: Session) -> None:
    """P4 Salud · quiz variado (multiple_choice + true_false, 4 bloques)."""
    slug = "p4-c2-l1-001-micro-descansos-placeholder"
    _delete_if_exists(db, slug)

    unit = create_unit(
        body=LearningUnitCreate(
            slug=slug,
            title=f"{PENDING} Micro-descansos que sí funcionan",
            pillar_code="P4", competency_code="C2", level_code="L1",
            estimated_duration_seconds=65,
        ),
        db=db, _=_SEED_ACTOR,
    )

    create_block(unit.id, VideoBlockCreate(
        block_type="video_intro", position=1, video_url=PLACEHOLDER_VIDEO_URL, duration_seconds=8,
    ), db=db, _=_SEED_ACTOR)

    evidence = create_block(unit.id, TextBlockCreate(
        block_type="text_evidence", position=2, variant="evidence", eyebrow="EVIDENCIA",
        body=(
            f"{PENDING} Un meta-análisis de 22 estudios (Sianoja, 2018) muestra que descansos de "
            "5-15 minutos con actividad de baja intensidad mejoran el rendimiento post-descanso en "
            "12-18%. Consumo de pantalla en el descanso lo reduce."
        ),
        citation={
            "text": f"{PENDING} Sianoja et al., Journal of Occupational Health Psychology (2018)",
            "source": "Sianoja et al.", "year": 2018,
            "doi_or_url": "https://doi.org/10.1037/ocp0000105", "tier": "meta_analysis",
        },
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, TextBlockCreate(
        block_type="text_solution", position=3, variant="solution", eyebrow="PROBÁ ESTO",
        body=(
            f"{PENDING} Cada 90 minutos: 5 min de caminata sin pantalla + 1 vaso de agua. Poné una "
            "alarma silenciosa. Al principio se siente inútil — dale una semana."
        ),
        applies_to=["P4"], requires_evidence_block_id=evidence.id,
    ), db=db, _=_SEED_ACTOR)

    create_block(unit.id, QuizBlockCreate(
        block_type="quiz_recall", position=4, required=True,
        questions=[
            QuizQuestionMultipleChoiceCreate(
                question_type="multiple_choice",
                prompt=(
                    f"{PENDING} Seleccioná todas las actividades de descanso que MEJORAN el "
                    "rendimiento post-descanso según la evidencia."
                ),
                options=[
                    QuizOptionCreate(
                        text=f"{PENDING} Caminata sin pantalla", is_correct=True,
                        explanation=f"{PENDING} Correcto — actividad física de baja intensidad.",
                    ),
                    QuizOptionCreate(
                        text=f"{PENDING} Hidratarse", is_correct=True,
                        explanation=f"{PENDING} Correcto, parte del protocolo estudiado.",
                    ),
                    QuizOptionCreate(
                        text=f"{PENDING} Scroll de redes sociales", is_correct=False,
                        explanation=f"{PENDING} Efecto negativo — descanso digital pasivo.",
                    ),
                ],
                scoring="partial",
            ),
            QuizQuestionTrueFalseCreate(
                question_type="true_false",
                prompt=(
                    f"{PENDING} Los descansos digitales (redes sociales) tienen el mismo efecto "
                    "restaurador que una caminata corta."
                ),
                correct_answer=False,
                explanation_true=f"{PENDING} Es la intuición común pero está mal.",
                explanation_false=(
                    f"{PENDING} Correcto — los descansos digitales pasivos no restauran igual; "
                    "el cerebro sigue procesando estímulos."
                ),
            ),
        ],
    ), db=db, _=_SEED_ACTOR)

    publish_unit(unit.id, db=db, _=_SEED_ACTOR)


def run() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db = SessionLocal()
    try:
        _seed_unit_1_onboarding_remoto(db)
        _seed_unit_2_feedback_directo(db)
        _seed_unit_3_micro_descansos(db)
        db.commit()
        log.info("seed_learning_units done: 3 units publicadas")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
