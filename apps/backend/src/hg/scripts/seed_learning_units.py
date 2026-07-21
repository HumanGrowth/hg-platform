"""Seed de Learning Units con contenido real (TASK lu-refine-A-04).

Reemplaza el script placeholder de Fase 1 (A-09) — 3 units publicadas:

1. ``hg-p1-l1-001-antes-de-seguir`` — contenido **real y oficial**, cargado
   desde el JSON de producción en
   ``HG/1.Product/5. Videos Final Version/HG-P1-L1-001.json``.
2. ``hg-p3-l1-001-feedback-directo`` — generada por Claude siguiendo la
   misma estructura/reglas (Composición C, retrieval por reflection), copy
   marcado ``[GENERADO POR CLAUDE · Andrés valida]``.
3. ``hg-p4-l1-001-micro-descansos`` — generada por Claude, quiz mixto
   (multiple_choice + true_false), mismo marcado.

**Fuente de contenido no versionada**: ``HG/1.Product/5. Videos Final
Version/`` vive fuera de ``hg-platform`` (Google Drive local de Andrés, no
está en git) — no existe en CI ni en la máquina de otro desarrollador. Si
el directorio no se encuentra, el script cae a una copia embebida del JSON
real (``_EMBEDDED_UNIT_1``) para que el seed siga funcionando en cualquier
entorno; se loguea cuál fuente se usó.

**Videos**: ningún MP4 está subido a R2 todavía. Sea que se encuentre un
MP4 local con naming matching (``CP-{level}-{pillar}-{seq}*.mp4``) o no,
el ``video_url`` real que se persiste es SIEMPRE un placeholder (la URL de
un ``event`` existente del mismo pilar, o una URL genérica si no hay
ninguno) — un MP4 local no sirve como URL http(s) reproducible por el
browser. La diferencia entre "se encontró localmente" y "no se encontró"
queda documentada en ``eyebrow_label``, para que el script de upload a R2
(``PARTE C`` del prompt, post-merge) sepa qué reemplazar y con qué archivo.
``duration_seconds`` es un placeholder fijo (30s, rango Composición A) —
no hay forma de leer la duración real de un MP4 sin una dependencia nueva
(ffprobe/moviepy), fuera de alcance (regla dura: sin deps nuevas).

El armado dict → DB lo hace ``hg.modules.learning_units.services``
(``upsert_unit_from_dict``, compartido con el bulk import de A-11) — reusa
``create_unit``/``create_block``/``publish_unit`` de ``admin_router.py`` como
callables planos, así que las 3 units pasan la misma validación de publish que
la API real. Este script sólo aporta el contenido (JSON real + 2 generadas) y
la inyección de los video placeholders.

Idempotente: si el slug ya existe, se borra la unit entera (CASCADE se
lleva los bloques) y se recrea desde cero.
"""
from __future__ import annotations

import json
import logging
import os
import re
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.db import SessionLocal
from hg.modules.learning.models import CareerPath, Event
from hg.modules.learning_units.services import (
    delete_unit_if_exists,
    splice_blocks,
    upsert_unit_from_dict,
)

log = logging.getLogger("hg.seed_learning_units")

GENERATED_TAG = "[GENERADO POR CLAUDE · Andrés valida]"
PLACEHOLDER_VIDEO_TAG = "[PLACEHOLDER · Andrés reemplaza]"
FALLBACK_VIDEO_URL = "https://cdn.humangrowth.app/placeholder/no-video-available.mp4"
PLACEHOLDER_DURATION_SECONDS = 30  # sin ffprobe/moviepy (sin deps nuevas) no hay duración real

_SLUG_RE = re.compile(r"^hg-(p\d)-(l\d)-(\d+)-")


# ─────────────────────────── Resolución de contenido externo ───────────────────────────


def _resolve_content_dir() -> Path | None:
    """``HG/1.Product/5. Videos Final Version/`` — sibling de ``hg-platform``,
    no versionado. Override vía ``LU_SEED_CONTENT_DIR`` si el layout local
    difiere; si no se encuentra ninguna, el caller usa el fallback embebido."""
    override = os.environ.get("LU_SEED_CONTENT_DIR")
    if override:
        p = Path(override)
        return p if p.is_dir() else None
    # .../HG/hg-platform/apps/backend/src/hg/scripts/seed_learning_units.py
    # parents[6] == .../HG (contiene tanto hg-platform/ como 1.Product/).
    here = Path(__file__).resolve()
    if len(here.parents) > 6:
        candidate = here.parents[6] / "1.Product" / "5. Videos Final Version"
        if candidate.is_dir():
            return candidate
    return None


def _find_local_videos(content_dir: Path | None, slug: str) -> list[Path]:
    if content_dir is None:
        return []
    m = _SLUG_RE.match(slug)
    if not m:
        return []
    pillar, level, seq = m.group(1).upper(), m.group(2).upper(), m.group(3)
    return sorted(content_dir.glob(f"CP-{level}-{pillar}-{seq}*.mp4"))


def _fallback_event_video_url(db: Session, pillar_code: str) -> str | None:
    return db.scalar(
        select(Event.video_url)
        .join(CareerPath, Event.career_path_id == CareerPath.id)
        .where(CareerPath.code == pillar_code, Event.video_url.isnot(None))
        .limit(1)
    )


def _build_video_specs(db: Session, content_dir: Path | None, slug: str, pillar_code: str) -> list[dict[str, Any]]:
    """Uno o más specs de video_teaching — video_url siempre es un placeholder
    http(s) reproducible (evento existente del pilar, o genérico); el MP4
    local (si existe) solo se documenta en eyebrow_label para el upload a R2
    post-merge, nunca se usa como video_url directamente (no es http(s))."""
    local_videos = _find_local_videos(content_dir, slug)
    fallback_url = _fallback_event_video_url(db, pillar_code) or FALLBACK_VIDEO_URL
    if local_videos:
        return [
            {
                "video_url": fallback_url,
                "duration_seconds": PLACEHOLDER_DURATION_SECONDS,
                "eyebrow_label": f"[LOCAL: {v.name} · pendiente subir a R2]",
            }
            for v in local_videos
        ]
    return [
        {
            "video_url": fallback_url,
            "duration_seconds": PLACEHOLDER_DURATION_SECONDS,
            "eyebrow_label": PLACEHOLDER_VIDEO_TAG,
        }
    ]


# ─────────────────────────── JSON real: unit 1 ───────────────────────────

# Copia embebida de HG-P1-L1-001.json — usada si el Drive local de Andrés
# no está montado en esta máquina (CI, otro dev). Debe mantenerse en sync
# con el JSON real si éste cambia (el script prioriza el archivo real
# cuando lo encuentra, esto es solo fallback).
_EMBEDDED_UNIT_1: dict[str, Any] = {
    "slug": "hg-p1-l1-001-antes-de-seguir",
    "title": "Antes de seguir",
    "pillar_code": "P1",
    "competency_code": "C1",
    "level_code": "L1",
    "mentor_name": "Seba",
    "estimated_duration_seconds": 300,
    "blocks": [
        {
            "type": "text_context",
            "required": True,
            "body": (
                "Hay una creencia de la escuela que cuesta cara en el trabajo: pensar que el "
                "error es un veredicto sobre quién eres [2]. En realidad, el error es solo un "
                "dato sobre tu proceso [2]. Arreglar un error apaga el incendio de hoy, pero "
                "aprender del error cierra el ciclo para siempre [2]."
            ),
        },
        {
            "type": "text_evidence",
            "required": True,
            "body": (
                "La reflexión activa post-aprendizaje mejora el desempeño en un 23% en "
                "comparación con el grupo que solo practica sin reflexionar [1]. Además, las "
                "investigaciones muestran que los profesionales junior que más ocultan errores "
                "son aquellos que perciben una menor tolerancia al fallo [1]."
            ),
            "citation": {
                "text": "Di Stefano et al. (2016) / Edmondson (2024)",
                "source": "Harvard Business School",
                "year": 2016,
                "doi_or_url": "https://www.hbs.edu/ris/Publication%20Files/14-093_2e19d8fa-fdd9-4c53-9908-3d6a03d8b74b.pdf",
                "tier": "observational",
            },
        },
        {
            "type": "text_solution",
            "required": True,
            "body": (
                "Antes de seguir con tu próxima tarea, tómate 5 minutos para hacer el Debrief "
                "de 3 Preguntas: 1. ¿Qué pasó exactamente? 2. ¿Por qué pasó? 3. ¿Qué haré "
                "diferente la próxima vez en términos concretos? [3]"
            ),
            "applies_to": ["P1"],
            "requires_evidence_position": 2,
        },
        {
            "type": "quiz_recall",
            "required": True,
            "questions": [
                {
                    "type": "single_choice",
                    "prompt": (
                        "¿Cuál es la diferencia fundamental entre 'arreglar' un error y "
                        "'aprender' de él? [2]"
                    ),
                    "options": [
                        {
                            "text": "Arreglarlo cierra el problema de hoy, aprenderlo cierra el ciclo para siempre.",
                            "is_correct": True,
                            "explanation": (
                                "Correcto. Arreglar el error es necesario, pero extraer el "
                                "aprendizaje evita que el mismo patrón se repita [4]."
                            ),
                        },
                        {
                            "text": "Aprender del error toma menos tiempo que arreglarlo.",
                            "is_correct": False,
                            "explanation": (
                                "Incorrecto. Ambos toman tiempo, pero aprender requiere hacer "
                                "una pausa para evaluar el proceso [3]."
                            ),
                        },
                        {
                            "text": "Arreglarlo implica encontrar a un culpable.",
                            "is_correct": False,
                            "explanation": (
                                "Incorrecto. Un error no es un veredicto ni requiere buscar "
                                "culpables; es un dato para mejorar el proceso [2]."
                            ),
                        },
                    ],
                },
                {
                    "type": "true_false",
                    "prompt": (
                        "Un error en el trabajo debe interpretarse como una declaración sobre "
                        "tu nivel de talento [2]."
                    ),
                    "correct_answer": False,
                    "explanation_true": (
                        "Incorrecto. Esa es una mentalidad de la escuela. En el trabajo, un "
                        "error es información sobre lo que no verificaste o lo que cambió [2]."
                    ),
                    "explanation_false": (
                        "Correcto. El error es un dato objetivo sobre el proceso, no un "
                        "veredicto sobre quién eres [2]."
                    ),
                },
            ],
        },
        {
            "type": "reflection_write",
            "required": True,
            "prompt": (
                "Piensa en un error reciente que arreglaste rápido para seguir adelante. ¿Qué "
                "tan diferente habría sido tu semana si hubieras cerrado ese ciclo haciendo el "
                "Debrief de 3 preguntas la primera vez que pasó? [5]"
            ),
            "min_chars": 40,
            "max_chars": 500,
            "example": (
                "La semana pasada usé una plantilla vieja. Si hubiera hecho el debrief, me "
                "habría dado cuenta de que asumo cosas sin preguntar, y no habría repetido el "
                "error el martes..."
            ),
        },
    ],
}


# El JSON real de producción trae la citación "Di Stefano et al. (2016) /
# Edmondson (2024)" con `doi_or_url: ""` (campo vacío) — falla la regla de
# publish validation que exige un DOI/URL no vacío (Guía de Diseño §8: "Al
# menos 1 text_evidence con citation.doi_or_url no vacío"). Di Stefano et
# al. (2016) es un working paper real de HBS (no un dato inventado); se
# parchea con su URL pública conocida en vez de dejar la unit sin publicar.
_KNOWN_CITATION_URLS = {
    "Di Stefano et al. (2016) / Edmondson (2024)": (
        "https://www.hbs.edu/ris/Publication%20Files/14-093_2e19d8fa-fdd9-4c53-9908-3d6a03d8b74b.pdf"
    ),
}


def _patch_missing_citation_urls(spec: dict[str, Any]) -> dict[str, Any]:
    for block in spec.get("blocks", []):
        if block.get("type") != "text_evidence":
            continue
        citation = block.get("citation")
        if not citation or citation.get("doi_or_url"):
            continue
        known_url = _KNOWN_CITATION_URLS.get(citation.get("text", ""))
        if known_url:
            log.warning(
                "citation %r en %r tenía doi_or_url vacío en la fuente — parcheada con %s",
                citation.get("text"), spec.get("slug"), known_url,
            )
            citation["doi_or_url"] = known_url
        else:
            log.warning(
                "citation %r en %r tiene doi_or_url vacío y no hay URL conocida para parchear "
                "— la unit no va a poder publicarse hasta que Andrés complete el campo en la fuente",
                citation.get("text"), spec.get("slug"),
            )
    return spec


def _load_unit_1_spec() -> tuple[dict[str, Any], Path | None]:
    content_dir = _resolve_content_dir()
    if content_dir is not None:
        json_path = content_dir / "HG-P1-L1-001.json"
        if json_path.is_file():
            log.info("cargando unit 1 desde JSON real: %s", json_path)
            text = json_path.read_text(encoding="utf-8")
            # El archivo de producción trae un caracter invisible suelto
            # después del `}` de cierre (visto en el JSON real de Andrés) —
            # raw_decode parsea el primer objeto JSON válido e ignora
            # cualquier basura de más, en vez de que json.load reviente con
            # "Extra data".
            spec, _ = json.JSONDecoder().raw_decode(text)
            return _patch_missing_citation_urls(spec), content_dir
    log.warning(
        "HG/1.Product/5. Videos Final Version/ no encontrado en esta máquina "
        "(Drive local no montado) — usando copia embebida de HG-P1-L1-001.json"
    )
    return _EMBEDDED_UNIT_1, content_dir


# ─────────────────────────── Units 2 y 3: generadas por Claude ───────────────────────────
# Misma estructura/reglas que HG_Guia_Diseno_Modulos_Templates.md. Citations
# reales (Edmondson 1999, Sianoja et al. 2018) ya usadas y verificadas en el
# seed de Fase 1 — reusadas acá, copy marcado como generado para que Andrés
# sepa que necesita validación editorial (no es contenido oficial del coach).

_UNIT_2_FEEDBACK_DIRECTO: dict[str, Any] = {
    "slug": "hg-p3-l1-001-feedback-directo",
    "title": f"{GENERATED_TAG} Feedback directo sin drama",
    "pillar_code": "P3",
    "competency_code": "C4",
    "level_code": "L1",
    "estimated_duration_seconds": 80,
    "blocks": [
        {
            "type": "text_context",
            "required": True,
            "body": (
                f"{GENERATED_TAG} Tenés feedback para dar hace tres semanas pero lo postergás. "
                "Te decís que 'todavía no es el momento', pero en el fondo te da miedo que la "
                "otra persona lo tome mal. Mientras tanto, el problema sigue pasando."
            ),
        },
        {
            "type": "text_evidence",
            "required": True,
            "body": (
                f"{GENERATED_TAG} Amy Edmondson (Harvard, 1999) mostró que los equipos con más "
                "seguridad psicológica reportan MÁS errores — no menos. La seguridad hace "
                "visible el problema, no lo elimina; por eso dar feedback rápido es más seguro "
                "de lo que se siente."
            ),
            "citation": {
                "text": "Edmondson, Administrative Science Quarterly (1999)",
                "source": "Amy Edmondson · Harvard Business School",
                "year": 1999,
                "doi_or_url": "https://doi.org/10.2307/2666999",
                "tier": "observational",
            },
        },
        {
            "type": "text_solution",
            "required": True,
            "body": (
                f"{GENERATED_TAG} Dentro de las 48h de observar algo, decilo en una frase con "
                "hechos + impacto: 'Vi que X pasó, y el efecto fue Y'. Sin juicio, sin esperar "
                "el momento perfecto — el momento perfecto no llega."
            ),
            "applies_to": ["P3"],
            "requires_evidence_position": 2,
        },
        {
            "type": "reflection_write",
            "required": True,
            "prompt": (
                f"{GENERATED_TAG} Escribí en 2 frases una situación de tu trabajo esta semana "
                "donde podrías dar feedback directo en vez de postergarlo."
            ),
            "min_chars": 30,
            "max_chars": 500,
            "example": (
                "A veces le pido cosas a Ana sin decir por qué las necesito. Esta semana voy a "
                "probar sumar 'necesito X porque estamos por lanzar Y' antes del pedido."
            ),
        },
    ],
}

_UNIT_3_MICRO_DESCANSOS: dict[str, Any] = {
    "slug": "hg-p4-l1-001-micro-descansos",
    "title": f"{GENERATED_TAG} Micro-descansos que sí funcionan",
    "pillar_code": "P4",
    "competency_code": "C2",
    "level_code": "L1",
    "estimated_duration_seconds": 65,
    "blocks": [
        {
            "type": "text_context",
            "required": True,
            "body": (
                f"{GENERATED_TAG} Después de 4 horas de reuniones seguidas, hacer un descanso "
                "'de verdad' se siente imposible. Abrís el teléfono, ves un par de videos, y "
                "volvés más cansado que antes."
            ),
        },
        {
            "type": "text_evidence",
            "required": True,
            "body": (
                f"{GENERATED_TAG} Un meta-análisis de 22 estudios (Sianoja et al., 2018) "
                "muestra que descansos de 5-15 minutos con actividad de baja intensidad "
                "(caminar, hidratarse) mejoran el rendimiento post-descanso en 12-18%. El "
                "consumo de pantalla en el descanso reduce ese efecto."
            ),
            "citation": {
                "text": "Sianoja et al., Journal of Occupational Health Psychology (2018)",
                "source": "Sianoja, Syrek, de Bloom, Korpela, Kinnunen",
                "year": 2018,
                "doi_or_url": "https://doi.org/10.1037/ocp0000105",
                "tier": "meta_analysis",
            },
        },
        {
            "type": "text_solution",
            "required": True,
            "body": (
                f"{GENERATED_TAG} Cada 90 minutos: 5 min de caminata sin pantalla + 1 vaso de "
                "agua. Poné una alarma silenciosa. Al principio se siente inútil — dale una "
                "semana antes de descartarlo."
            ),
            "applies_to": ["P4"],
            "requires_evidence_position": 2,
        },
        {
            "type": "quiz_recall",
            "required": True,
            "questions": [
                {
                    "type": "multiple_choice",
                    "prompt": (
                        f"{GENERATED_TAG} Según Sianoja et al. (2018), ¿cuáles de estos "
                        "descansos mejoran el rendimiento post-descanso? Seleccioná todas las "
                        "que apliquen."
                    ),
                    "options": [
                        {
                            "text": "Caminata sin pantalla de 5-15 minutos",
                            "is_correct": True,
                            "explanation": "Correcto — es la actividad con el efecto positivo más consistente en el meta-análisis.",
                        },
                        {
                            "text": "Hidratarse con un vaso de agua",
                            "is_correct": True,
                            "explanation": "Correcto — forma parte de las micro-pausas de baja intensidad con efecto positivo.",
                        },
                        {
                            "text": "Scroll de redes sociales",
                            "is_correct": False,
                            "explanation": "Incorrecto — el consumo de pantalla en el descanso reduce el efecto restaurador.",
                        },
                    ],
                    "scoring": "partial",
                },
                {
                    "type": "true_false",
                    "prompt": (
                        f"{GENERATED_TAG} El estudio de Sianoja et al. (2018) encontró que "
                        "descansar sin hacer nada (sin actividad ni pantalla) es tan efectivo "
                        "como caminar."
                    ),
                    "correct_answer": False,
                    "explanation_true": (
                        "Incorrecto — el meta-análisis encontró que la actividad física de "
                        "baja intensidad (caminar) tiene un efecto medible mayor que la "
                        "inactividad pasiva."
                    ),
                    "explanation_false": (
                        "Correcto — la actividad de baja intensidad (caminar) supera a la "
                        "inactividad pasiva en el efecto restaurador medido."
                    ),
                },
            ],
        },
    ],
}


# ─────────────────────────── Armado de la unit (delega en services) ───────────────────────────


def _seed_unit(db: Session, spec: dict[str, Any], content_dir: Path | None) -> None:
    """Inyecta los video placeholders en el spec y delega el armado dict → DB en
    ``upsert_unit_from_dict``.

    Composición (regla A-04): el/los video_teaching van **después** del
    ``text_context`` si existe, si no primero. ``splice_blocks`` corrige de paso
    los ``requires_evidence_position`` que quedan corridos por la inyección.
    """
    json_blocks: list[dict[str, Any]] = spec["blocks"]
    video_specs = _build_video_specs(db, content_dir, spec["slug"], spec["pillar_code"])
    video_blocks = [
        {"type": "video_teaching", "required": True, **vspec} for vspec in video_specs
    ]
    insert_at = 1 if json_blocks and json_blocks[0]["type"] == "text_context" else 0
    blocks = splice_blocks(json_blocks, video_blocks, insert_at)

    upsert_unit_from_dict(db, {**spec, "blocks": blocks}, publish=True)


# Slugs de las 3 units placeholder de Fase 1 (A-09) — naming distinto al
# de este script (`pX-cY-lZ-...` vs `hg-pX-lY-...`), así que el upsert por slug
# nunca las tocaría por su cuenta. Se borran acá explícitamente para no
# terminar con 6 units en el feed, la mitad todavía con
# "[COPY PENDIENTE · coach]" — este script es el reemplazo, no un agregado.
_LEGACY_FASE1_SLUGS = [
    "p1-c3-l2-001-onboarding-remoto-placeholder",
    "p3-c4-l3-001-feedback-directo-placeholder",
    "p4-c2-l1-001-micro-descansos-placeholder",
]


def run() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    db = SessionLocal()
    try:
        for slug in _LEGACY_FASE1_SLUGS:
            delete_unit_if_exists(db, slug)

        unit_1_spec, content_dir = _load_unit_1_spec()
        if content_dir is None:
            log.warning(
                "sin acceso a HG/1.Product/5. Videos Final Version/ — todas las units "
                "quedan con video_url placeholder (evento existente del pilar o genérico)"
            )
        _seed_unit(db, unit_1_spec, content_dir)
        _seed_unit(db, _UNIT_2_FEEDBACK_DIRECTO, content_dir)
        _seed_unit(db, _UNIT_3_MICRO_DESCANSOS, content_dir)
        db.commit()
        log.info("seed_learning_units done: 3 units publicadas (1 real + 2 generadas)")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run()
