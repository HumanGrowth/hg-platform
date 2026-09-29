"""Servicios de dominio de Learning Units — armado de units desde dicts planos.

Este módulo centraliza la traducción **dict JSON → schemas admin → filas de DB**
que antes vivía inline en ``hg.scripts.seed_learning_units`` (TASK A-04). Se
extrajo acá para que dos callers la compartan sin duplicarla:

- ``seed_learning_units`` (seed de contenido real/generado, A-04).
- ``sync_units_from_drive`` (bulk import desde Google Drive, A-11).

Reusa ``create_unit`` / ``create_block`` / ``publish_unit`` de ``admin_router``
como callables Python planos (bypass de FastAPI DI) — garantiza que toda unit
armada acá pasa exactamente la misma validación de publish que la API real.

**Contrato del dict** (mismo formato que ``HG-P1-L1-001.json`` + bloques de
video opcionales)::

    {
      "slug": "hg-p1-l1-001-antes-de-seguir",
      "title": "Antes de seguir",
      "dimension_code": "CP",            # dimensión Drive (TASK 1); antes dimension_code
      "pillar_code": "P1",             # opcional — el P<n> (o "AI"…) del código Drive
      "unit_number": 1,                  # opcional — el seq del código Drive
      "competency_code": "C1",           # opcional
      "level_code": "L1",
      "estimated_duration_seconds": 300,  # opcional
      "mentor_name": "Seba",              # ignorado (el modelo usa mentor_id)
      "blocks": [
        {"type": "video_intro", "video_url": "...", "duration_seconds": 60, ...},
        {"type": "text_context", "body": "..."},
        {"type": "text_evidence", "body": "...", "citation": {...}},
        {"type": "text_solution", "body": "...", "requires_evidence_position": 3},
        {"type": "quiz_recall", "questions": [...]},
        {"type": "reflection_write", "prompt": "...", "min_chars": 40, ...}
      ]
    }

``requires_evidence_position`` es la **posición 1-indexada del bloque destino
dentro de la lista ``blocks`` tal como se la pasa a**
:func:`upsert_unit_from_dict` (no una posición "lógica" independiente de los
videos). Si un caller inserta bloques de video y con eso corre las posiciones,
tiene que ajustar ``requires_evidence_position`` — para eso está
:func:`splice_blocks`, que hace el fixup automáticamente.
"""
from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, cast

from pydantic import TypeAdapter, ValidationError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.identity.models import User
from hg.modules.learning_units.admin_router import (
    _create_block_content,
    _create_question,
    _validate_for_publish,
    create_block,
    create_unit,
    publish_unit,
)
from hg.modules.learning_units.models import (
    BLOCK_TYPE_TO_MODEL,
    LearningUnit,
    QuizBlock,
    QuizQuestion,
    ReflectionBlock,
    TextBlock,
    UnitBlock,
    UnitBlockType,
    VideoBlock,
)
from hg.modules.learning_units.schemas import (
    BlockPresentation,
    CitationOut,
    FillBlankAnswerCreate,
    LearningUnitCreate,
    MatchingPairCreate,
    OrderingItemCreate,
    QuizBlockCreate,
    QuizOptionCreate,
    QuizQuestionCreateUnion,
    QuizQuestionFillBlankCreate,
    QuizQuestionMatchingCreate,
    QuizQuestionMultipleChoiceCreate,
    QuizQuestionOrderingCreate,
    QuizQuestionSingleChoiceCreate,
    QuizQuestionTrueFalseCreate,
    ReflectionBlockCreate,
    TextBlockCreate,
    VideoBlockCreate,
)

log = logging.getLogger("hg.learning_units.services")

# Los endpoints admin exigen ``_: User = Depends(require_role("superadmin"))``
# como parámetro de autorización. Al invocarlos como funciones planas (sin
# FastAPI DI) no hay un ``User`` real; ``cast`` en vez de ``None`` satisface a
# mypy sin tocar la firma de ``admin_router`` — es un no-op en runtime (los
# endpoints nunca leen ese parámetro, sólo lo declaran para el guard de DI).
_SEED_ACTOR = cast(User, None)

_VIDEO_TYPES = frozenset({"video_intro", "video_teaching", "video_closing"})

# variant + eyebrow por defecto de cada bloque de texto. El eyebrow es un
# ``Field(min_length=1)`` requerido en ``TextBlockCreate`` pero el JSON de
# contenido (real y de Drive) no lo trae — se completa con estos defaults,
# override-able por bloque vía ``block["eyebrow"]``.
_TEXT_VARIANT_AND_EYEBROW: dict[str, tuple[str, str]] = {
    "text_context": ("context", "SITUACIÓN"),
    "text_evidence": ("evidence", "EVIDENCIA"),
    "text_solution": ("solution", "PROBÁ ESTO"),
}


# Tags de presentación que el JSON de la unit trae PLANOS a nivel bloque (spec
# §4.A/C) y que se agrupan en ``text_blocks.presentation``. eyebrow / hero_stat /
# checklist_items / keywords NO están acá: ya tienen columna propia.
PRESENTATION_TAGS = tuple(BlockPresentation.model_fields)
_PRESENTATION_FIELD_ADAPTERS: dict[str, TypeAdapter[Any]] = {
    name: TypeAdapter(field.annotation) for name, field in BlockPresentation.model_fields.items()
}


def sanitize_presentation(block: dict[str, Any], slug: str = "?") -> dict[str, Any] | None:
    """Extrae y valida los tags de presentación de un bloque del dict de la unit.

    Acepta los tags planos (``{"template": "stat", "tone": "green", ...}``, como
    en el spec) y/o anidados bajo ``presentation``. Un valor inválido (fuera del
    enum o mal formado) se **ignora con un warning** — nunca rompe la ingesta.
    Devuelve ``None`` si no queda ningún tag válido (columna NULL = auto-detect)."""
    raw: dict[str, Any] = {}
    nested = block.get("presentation")
    if isinstance(nested, dict):
        raw.update(nested)
    for tag in PRESENTATION_TAGS:
        if tag in block:
            raw[tag] = block[tag]

    out: dict[str, Any] = {}
    for tag, value in raw.items():
        adapter = _PRESENTATION_FIELD_ADAPTERS.get(tag)
        if adapter is None or value is None:
            continue  # tag desconocido / vacío: se ignora en silencio (extensible)
        try:
            validated = adapter.validate_python(value)
        except ValidationError:
            log.warning(
                "  %s: tag de presentación %s=%r inválido — se ignora (corregir en el Doc)",
                slug, tag, value,
            )
            continue
        out[tag] = validated.model_dump(exclude_none=True) if hasattr(validated, "model_dump") else validated
    return out or None


class UnitDictError(ValueError):
    """El dict de la unit no cumple el contrato esperado (bloque/pregunta
    desconocido, campo faltante)."""


def _translate_question(q: dict[str, Any]) -> QuizQuestionCreateUnion:
    """Traduce una pregunta del JSON a su schema ``*Create`` (los 6 tipos)."""
    qtype = q.get("type")
    if qtype == "single_choice":
        return QuizQuestionSingleChoiceCreate(
            question_type="single_choice",
            prompt=q["prompt"],
            options=[QuizOptionCreate(**o) for o in q["options"]],
        )
    if qtype == "multiple_choice":
        return QuizQuestionMultipleChoiceCreate(
            question_type="multiple_choice",
            prompt=q["prompt"],
            options=[QuizOptionCreate(**o) for o in q["options"]],
            scoring=q.get("scoring", "partial"),
        )
    if qtype == "true_false":
        return QuizQuestionTrueFalseCreate(
            question_type="true_false",
            prompt=q["prompt"],
            correct_answer=q["correct_answer"],
            explanation_true=q["explanation_true"],
            explanation_false=q["explanation_false"],
        )
    if qtype == "ordering":
        return QuizQuestionOrderingCreate(
            question_type="ordering",
            prompt=q["prompt"],
            items=[OrderingItemCreate(**it) for it in q["items"]],
        )
    if qtype == "matching":
        return QuizQuestionMatchingCreate(
            question_type="matching",
            prompt=q["prompt"],
            pairs=[MatchingPairCreate(**p) for p in q["pairs"]],
        )
    if qtype == "fill_blank":
        return QuizQuestionFillBlankCreate(
            question_type="fill_blank",
            prompt=q["prompt"],
            answers=[FillBlankAnswerCreate(**a) for a in q["answers"]],
        )
    raise UnitDictError(f"tipo de pregunta no soportado: {qtype!r}")


def _block_to_create(
    block: dict[str, Any],
    position: int,
    evidence_ids_by_position: dict[int, uuid.UUID],
) -> VideoBlockCreate | TextBlockCreate | QuizBlockCreate | ReflectionBlockCreate:
    """Traduce un bloque del dict al schema ``*Create`` correspondiente.

    ``evidence_ids_by_position`` mapea posición 1-indexada de un bloque
    ``text_evidence`` ya creado → su ``unit_block.id`` (lo que
    ``create_block`` devolvió), para resolver ``requires_evidence_position``.
    """
    btype = block.get("type")
    required = block.get("required", True)

    if btype in _VIDEO_TYPES:
        return VideoBlockCreate(
            block_type=btype,  # type: ignore[arg-type]  # validado por el frozenset
            position=position,
            required=required,
            video_url=block["video_url"],
            poster_url=block.get("poster_url"),
            duration_seconds=block["duration_seconds"],
            subtitle_url=block.get("subtitle_url"),
            transcript_text=block.get("transcript_text"),
            eyebrow_label=block.get("eyebrow_label"),
        )

    if btype in _TEXT_VARIANT_AND_EYEBROW:
        variant, default_eyebrow = _TEXT_VARIANT_AND_EYEBROW[btype]
        evidence_id: uuid.UUID | None = None
        if btype == "text_solution":
            pos = block.get("requires_evidence_position")
            if pos is not None:
                evidence_id = evidence_ids_by_position.get(pos)
                if evidence_id is None:
                    raise UnitDictError(
                        f"text_solution en posición {position} referencia "
                        f"requires_evidence_position={pos}, que no es un text_evidence "
                        "previo en esta unit"
                    )
        citation = block.get("citation")
        return TextBlockCreate(
            block_type=btype,  # type: ignore[arg-type]
            position=position,
            required=required,
            variant=variant,  # type: ignore[arg-type]
            eyebrow=block.get("eyebrow") or default_eyebrow,
            body=block["body"],
            citation=CitationOut(**citation) if citation else None,
            applies_to=block.get("applies_to"),
            requires_evidence_block_id=evidence_id,
            hero_stat=block.get("hero_stat"),
            checklist_items=block.get("checklist_items"),
            # Ya saneado por `sanitize_presentation` en el sync; se re-valida
            # (estricto) acá para que cualquier otro caller también quede cubierto.
            presentation=block.get("presentation"),
        )

    if btype == "quiz_recall":
        extra: dict[str, Any] = {}
        if block.get("eyebrow"):
            extra["eyebrow"] = block["eyebrow"]
        return QuizBlockCreate(
            block_type="quiz_recall",
            position=position,
            required=required,
            questions=[_translate_question(q) for q in block["questions"]],
            **extra,
        )

    if btype == "reflection_write":
        extra_r: dict[str, Any] = {}
        if block.get("eyebrow"):
            extra_r["eyebrow"] = block["eyebrow"]
        return ReflectionBlockCreate(
            block_type="reflection_write",
            position=position,
            required=required,
            prompt=block["prompt"],
            min_chars=block.get("min_chars", 30),
            max_chars=block.get("max_chars", 500),
            example=block.get("example"),
            **extra_r,
        )

    raise UnitDictError(f"tipo de bloque no soportado: {btype!r}")


def splice_blocks(
    content_blocks: list[dict[str, Any]],
    inserted_blocks: list[dict[str, Any]],
    at: int,
) -> list[dict[str, Any]]:
    """Inserta ``inserted_blocks`` en el índice ``at`` de ``content_blocks`` y
    corrige los ``requires_evidence_position`` que quedaron corridos.

    ``requires_evidence_position`` es 1-indexado respecto de la lista final.
    Todo bloque destino cuya posición original (1-indexada) sea ``> at`` se
    desplaza por ``len(inserted_blocks)``. Se copian los dicts afectados (no se
    mutan los del caller).

    Ej.: content = [ctx, ev, sol(req=2)], insert 1 video ``at=1`` (después de
    ctx) → [ctx, video, ev, sol(req=3)] (la evidence pasó de pos 2 a 3).
    """
    shift = len(inserted_blocks)
    if shift == 0:
        return list(content_blocks)
    fixed: list[dict[str, Any]] = []
    for block in content_blocks:
        pos = block.get("requires_evidence_position")
        if pos is not None and pos > at:
            block = {**block, "requires_evidence_position": pos + shift}
        fixed.append(block)
    return fixed[:at] + list(inserted_blocks) + fixed[at:]


def delete_unit_if_exists(db: Session, slug: str) -> bool:
    """Borra la unit con ``slug`` si existe (CASCADE se lleva bloques y, si
    hubiera, attempts). Devuelve ``True`` si borró algo."""
    existing = db.scalar(select(LearningUnit).where(LearningUnit.slug == slug))
    if existing is None:
        return False
    db.delete(existing)
    db.flush()
    return True


def upsert_unit_from_dict(
    db: Session,
    unit_dict: dict[str, Any],
    publish: bool = False,
) -> LearningUnit:
    """Crea (o recrea) una unit completa desde un dict plano. Idempotente por slug.

    Idempotencia por **delete + recreate**: si el slug ya existe, se borra la
    unit entera (CASCADE) y se rearma desde cero. Es coherente con el patrón
    que ya usaba ``seed_learning_units`` y da un resultado limpio al re-importar
    (sin bloques huérfanos ni duplicados). Nota: recrear cambia el ``id`` de la
    unit y —si existieran— borraría attempts asociados; es aceptable para
    contenido en proceso de import (todavía sin attempts de usuarios reales).

    Si ``publish=True`` corre la validación real de publish (:func:`publish_unit`)
    y setea ``published_at``. Si la unit no cumple las reglas, ``publish_unit``
    levanta ``HTTPException(422)`` — el caller decide si abortar o dejarla como
    borrador (ver ``sync_units_from_drive``).
    """
    slug = unit_dict["slug"]
    delete_unit_if_exists(db, slug)

    unit_detail = create_unit(
        body=LearningUnitCreate(
            slug=slug,
            title=unit_dict["title"],
            dimension_code=unit_dict["dimension_code"],
            area_code=unit_dict.get("area_code"),
            pillar_code=unit_dict.get("pillar_code"),
            unit_number=unit_dict.get("unit_number"),
            competency_code=unit_dict.get("competency_code"),
            level_code=unit_dict["level_code"],
            estimated_duration_seconds=unit_dict.get("estimated_duration_seconds"),
        ),
        db=db,
        _=_SEED_ACTOR,
    )

    blocks: list[dict[str, Any]] = unit_dict.get("blocks", [])
    # posición 1-indexada del bloque en la lista final → unit_block.id, sólo
    # para text_evidence (lo que consumen los text_solution).
    evidence_ids_by_position: dict[int, uuid.UUID] = {}
    for position, block in enumerate(blocks, start=1):
        payload = _block_to_create(block, position, evidence_ids_by_position)
        created = create_block(unit_detail.id, payload, db=db, _=_SEED_ACTOR)
        if block.get("type") == "text_evidence":
            evidence_ids_by_position[position] = created.id

    if publish:
        publish_unit(unit_detail.id, db=db, _=_SEED_ACTOR)

    unit = db.get(LearningUnit, unit_detail.id)
    assert unit is not None  # recién creada en esta misma sesión
    return unit


@dataclass
class InPlaceReport:
    """Qué hizo (o haría) :func:`update_unit_in_place` sobre una unit existente."""

    matched: int = 0  # bloques conservados (mismo id, contenido actualizado)
    added: int = 0
    removed: int = 0
    quiz_questions_replaced: int = 0
    # Progreso de usuarios que se pierde por bloques eliminados / quizzes recreados.
    block_progress_lost: int = 0
    quiz_responses_lost: int = 0
    validation_errors: list[str] = field(default_factory=list)


_UNIT_FIELDS = (
    "title", "dimension_code", "area_code", "pillar_code", "unit_number",
    "competency_code", "level_code", "estimated_duration_seconds",
)


def update_unit_in_place(db: Session, unit: LearningUnit, unit_dict: dict[str, Any]) -> InPlaceReport:
    """Actualiza una unit **existente** con el contenido de ``unit_dict`` SIN
    borrarla, para conservar todo lo que cuelga de ella: intentos, asignaciones,
    rutas custom y el progreso por bloque de los usuarios.

    A diferencia de :func:`upsert_unit_from_dict` (delete + recreate, CASCADE),
    acá se conserva el ``id`` de la unit y el ``unit_blocks.id`` de cada bloque
    que se puede **emparejar** con uno nuevo (mismo tipo, en orden: el k-ésimo
    bloque de un tipo ↔ el k-ésimo del mismo tipo). El contenido de los bloques
    emparejados se reescribe completo desde ``unit_dict``; los bloques nuevos se
    crean y los que sobran se eliminan (perdiendo su ``block_progress``).

    Por bloque: video conserva poster/subtítulos/capítulos (sólo se actualizan
    ``video_url`` y ``eyebrow_label``); reflexión se edita in situ (sus textos
    de usuarios sobreviven); quiz conserva la fila del bloque y **recrea sus
    preguntas** (las respuestas de quiz de esas preguntas se pierden y se
    cuentan en el reporte).

    Sólo hace flush. No cambia ``published_at``; devuelve en ``validation_errors``
    lo que impediría publicarla — si la unit estaba publicada y hay errores, el
    caller decide (típicamente rollback para no degradar una unit en uso).
    """
    report = InPlaceReport()
    for f in _UNIT_FIELDS:
        if f in unit_dict:
            setattr(unit, f, unit_dict[f])
    unit.updated_at = func.now()
    db.flush()

    existing = list(
        db.scalars(select(UnitBlock).where(UnitBlock.unit_id == unit.id).order_by(UnitBlock.position))
    )
    incoming: list[dict[str, Any]] = unit_dict.get("blocks", [])

    # 1. Emparejar por (tipo, ocurrencia).
    pool: dict[str, list[UnitBlock]] = {}
    for ub in existing:
        pool.setdefault(ub.block_type.value, []).append(ub)
    matches: dict[int, UnitBlock] = {}  # índice del bloque nuevo → unit_block existente
    for i, blk in enumerate(incoming):
        candidates = pool.get(str(blk.get("type")))
        if candidates:
            matches[i] = candidates.pop(0)
    leftovers = [ub for lst in pool.values() for ub in lst]

    # 2. Eliminar los sobrantes (template + unit_block).
    for ub in leftovers:
        report.block_progress_lost += _count_block_progress(db, ub.id)
        template = db.get(BLOCK_TYPE_TO_MODEL[ub.block_type], ub.block_id)
        db.delete(ub)
        db.flush()
        if template is not None:
            db.delete(template)
            db.flush()
        report.removed += 1

    # 3. Sacar de en medio las posiciones (UNIQUE unit_id+position) de los que quedan.
    kept = [ub for ub in existing if ub not in leftovers]
    for ub in kept:
        ub.position = ub.position + 10_000
    db.flush()

    # 4. Recorrer los bloques nuevos en orden.
    evidence_ids_by_position: dict[int, uuid.UUID] = {}
    for i, blk in enumerate(incoming):
        position = i + 1
        payload = _block_to_create(blk, position, evidence_ids_by_position)
        matched_ub = matches.get(i)
        if matched_ub is None:
            new_id = _create_block_content(db, unit.id, payload)
            ub = UnitBlock(
                unit_id=unit.id, position=position, block_type=UnitBlockType(payload.block_type),
                block_id=new_id, required=payload.required,
            )
            db.add(ub)
            db.flush()
            report.added += 1
        else:
            ub = matched_ub
            _rewrite_block_content(db, unit.id, ub, payload, report)
            ub.position = position
            ub.required = payload.required
            db.flush()
            report.matched += 1
        if blk.get("type") == "text_evidence":
            evidence_ids_by_position[position] = ub.id

    db.refresh(unit)
    report.validation_errors = list(_validate_for_publish(db, unit))
    return report


def _count_block_progress(db: Session, unit_block_id: uuid.UUID) -> int:
    from hg.modules.learning_units.models import BlockProgress

    return db.scalar(
        select(func.count()).select_from(BlockProgress).where(BlockProgress.unit_block_id == unit_block_id)
    ) or 0


def _rewrite_block_content(
    db: Session, unit_id: uuid.UUID, ub: UnitBlock, payload: Any, report: InPlaceReport
) -> None:
    """Reescribe el contenido del bloque emparejado ``ub`` conservando su id."""
    model = BLOCK_TYPE_TO_MODEL[ub.block_type]
    row = db.get(model, ub.block_id)
    if row is None:  # referencia colgante: se rearma el contenido
        ub.block_id = _create_block_content(db, unit_id, payload)
        return

    if isinstance(row, VideoBlock):
        row.video_url = payload.video_url
        row.eyebrow_label = payload.eyebrow_label
    elif isinstance(row, TextBlock):
        # Se crea el contenido nuevo (resuelve evidence, valida presentation) y se
        # copia campo a campo a la fila existente, así conserva su id.
        new_id = _create_block_content(db, unit_id, payload)
        new = db.get(TextBlock, new_id)
        assert new is not None
        for col in (
            "eyebrow", "body", "citation", "applies_to", "requires_evidence_block_id",
            "hero_stat", "checklist_items", "presentation",
        ):
            setattr(row, col, getattr(new, col))
        db.flush()
        db.delete(new)
    elif isinstance(row, ReflectionBlock):
        row.eyebrow = payload.eyebrow
        row.prompt = payload.prompt
        row.min_chars = payload.min_chars
        row.max_chars = payload.max_chars
        row.example = payload.example
    elif isinstance(row, QuizBlock):
        row.eyebrow = payload.eyebrow
        old_q = list(db.scalars(select(QuizQuestion).where(QuizQuestion.quiz_block_id == row.id)))
        from hg.modules.learning_units.models import QuizResponse

        qids = [q.id for q in old_q]
        if qids:
            report.quiz_responses_lost += db.scalar(
                select(func.count()).select_from(QuizResponse).where(QuizResponse.question_id.in_(qids))
            ) or 0
        report.quiz_questions_replaced += len(old_q)
        db.query(QuizQuestion).filter(QuizQuestion.quiz_block_id == row.id).delete()
        db.flush()
        for n, q in enumerate(payload.questions, start=1):
            _create_question(db, row.id, n, q)
    db.flush()


def try_publish(db: Session, unit: LearningUnit) -> list[str]:
    """Intenta publicar ``unit``; devuelve ``[]`` si publicó o la lista de
    errores de validación si no.

    Variante *resiliente* de :func:`upsert_unit_from_dict` con ``publish=True``
    (que levanta ``HTTPException`` ante un fallo): pensada para el bulk import,
    donde una unit inválida no debe abortar el resto — se deja como borrador y
    se reportan los motivos. Reusa la misma validación real de
    :func:`publish_unit`.
    """
    from fastapi import HTTPException

    try:
        publish_unit(unit.id, db=db, _=_SEED_ACTOR)
        return []
    except HTTPException as exc:
        detail = exc.detail
        if isinstance(detail, dict) and "errors" in detail:
            return [str(e) for e in detail["errors"]]
        return [str(detail)]
