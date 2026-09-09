"""Motor de recomendación de "Mi Ruta" (cierre-beta TASK 1).

Arma una secuencia recomendada de learning units para el usuario:
- `current_level`: nivel más bajo con units pendientes (arranca L1, avanza al
  completar todas las de ese nivel).
- `next_step` + `upcoming`: units pendientes del nivel actual. Se prioriza CP
  (Carrera) alternando 1:1 con el resto de dimensiones, tomando el resto en orden
  de menor score (la que más necesita trabajo) primero; dentro de una dimensión,
  por pilar y número (orden del Drive).
- `dimensions_progress`: completed/total por cada uno de los 6 pilares.
- `milestones`: hitos intercalados en la secuencia — el fin de un ÁREA (todas las
  units de un `(dimensión, pilar)`) y el fin de un NIVEL de la dimensión, cada uno
  con la insignia que se gana al llegar. Se anclan a la unit de la secuencia que
  los desbloquea (`after_unit_id`), para que el front los intercale sin recalcular.

Nota: hoy solo la dimensión CP (Carrera) tiene contenido, así que la priorización
y la alternación cross-dimensión recién se notan cuando se suban las otras 5. El
score por dimensión sale de `state_code`/`sub_scores` del assessment con un
mapeo best-effort (escalas heterogéneas entre pilares) — sirve para ordenar, no
como número exhibido.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.assessment.models import DimensionResult
from hg.modules.assessment.service import latest_dimension_results
from hg.modules.badges.models import Badge, DimensionScoringConfig
from hg.modules.identity.models import User
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.area_access import visible_units_predicate
from hg.modules.learning_units.dimensions import career_path_for_dimension
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt
from hg.modules.learning_units.pillars import pillar_display_name, pillar_rank

_LEVEL_RE = re.compile(r"L(\d+)")


@dataclass
class PathStep:
    unit_id: uuid.UUID
    slug: str
    title: str
    dimension_code: str
    career_path_code: str
    level_code: str
    pillar_code: str | None
    estimated_minutes: int | None


@dataclass
class PathMilestone:
    """Hito de la ruta: el punto donde se cierra un área o un nivel, con la
    insignia que se gana al llegar. ``after_unit_id`` es la unit de la secuencia
    que lo desbloquea — el front lo inserta justo después de esa tarjeta."""

    kind: str  # "area" | "level"
    after_unit_id: uuid.UUID
    title: str
    dimension_code: str
    career_path_code: str
    pillar_code: str | None
    level_code: str | None
    badge_code: str
    badge_name: str
    badge_icon_url: str
    units_remaining: int
    # Los badges de nivel mezclan aprendizaje + assessment: terminar las units no
    # alcanza si la dimensión pondera la evaluación. El front lo dice explícito
    # en vez de prometer una insignia que no se va a otorgar.
    requires_assessment: bool = False
    # Posición 0-based dentro de la secuencia COMPLETA del nivel actual (no solo
    # de `upcoming`, que el front trunca a `upcoming_n`). Con esto el front
    # calcula el % exacto sobre la barra de nivel para CUALQUIER hito, aunque su
    # unit ancla no esté entre las visibles en "Sigue en tu ruta".
    sequence_position: int = 0


@dataclass
class DimensionProgress:
    career_path_code: str
    name: str
    completed: int
    total: int


@dataclass
class PathResult:
    current_level: str | None
    next_step: PathStep | None
    upcoming: list[PathStep]
    completed_this_level: int
    total_this_level: int
    dimensions_progress: list[DimensionProgress] = field(default_factory=list)
    milestones: list[PathMilestone] = field(default_factory=list)


def _level_num(level_code: str) -> int:
    m = _LEVEL_RE.search(level_code or "")
    return int(m.group(1)) if m else 99


def _dimension_score(result: DimensionResult | None) -> float:
    """Score 0..1 aproximado de una dimensión (menor = necesita más trabajo).
    Best-effort sobre escalas heterogéneas: nivel Lx normalizado, o media de los
    sub_scores numéricos, o 0.5 neutro."""
    if result is None:
        return 0.5  # sin assessment → prioridad media
    m = _LEVEL_RE.fullmatch(result.state_code or "")
    if m:
        return min(int(m.group(1)) / 6.0, 1.0)
    nums = [float(v) for v in (result.sub_scores or {}).values() if isinstance(v, (int, float))]
    if nums:
        # sub_scores suelen ir 0..~7; normalizamos a 0..1 con tope defensivo.
        return min((sum(nums) / len(nums)) / 7.0, 1.0)
    return 0.5


def _career_path_for_dimension(dimension_code: str) -> str:
    """Assessment dimension (P1..P5, P6A/P6B) → career_path (P6A/P6B → P6)."""
    return "P6" if dimension_code.startswith("P6") else dimension_code


def _interleave(groups: list[list[PathStep]]) -> list[PathStep]:
    """Round-robin entre dimensiones (grupos ya ordenados) para alternar y no
    poner 3 seguidas de la misma dimensión."""
    out: list[PathStep] = []
    idx = 0
    remaining = [g[:] for g in groups]
    while any(remaining):
        g = remaining[idx % len(remaining)]
        if g:
            out.append(g.pop(0))
        idx += 1
        if idx > 10_000:  # guarda anti-loop
            break
    return out


def _milestone_groups(
    units: list[LearningUnit],
    completed_ids: set[uuid.UUID],
    sequence: list[PathStep],
) -> list[tuple[str, tuple[str, str], list[LearningUnit]]]:
    """Grupos candidatos a hito: ``("area", (dim, pilar), units)`` y
    ``("level", (dim, nivel), units)`` sobre TODAS las units publicadas.

    Un grupo solo califica si le quedan units pendientes y **todas** están en la
    secuencia recomendada: si alguna pendiente cae fuera (otro nivel, otra
    dimensión priorizada más adelante), el hito no es alcanzable siguiendo la
    ruta y prometerlo sería mentir.
    """
    seq_ids = {s.unit_id for s in sequence}
    areas: dict[tuple[str, str], list[LearningUnit]] = {}
    levels: dict[tuple[str, str], list[LearningUnit]] = {}
    for u in units:
        if u.pillar_code:
            areas.setdefault((u.dimension_code, u.pillar_code), []).append(u)
        levels.setdefault((u.dimension_code, u.level_code), []).append(u)

    out: list[tuple[str, tuple[str, str], list[LearningUnit]]] = []
    for kind, groups in (("area", areas), ("level", levels)):
        for key, group in groups.items():
            pending = [u for u in group if u.id not in completed_ids]
            if not pending or any(u.id not in seq_ids for u in pending):
                continue
            out.append((kind, key, pending))
    return out


def _build_milestones(
    db: Session,
    units: list[LearningUnit],
    completed_ids: set[uuid.UUID],
    sequence: list[PathStep],
) -> list[PathMilestone]:
    """Todos los hitos alcanzables del nivel actual — uno por área/nivel cuyas
    units pendientes están enteramente en `sequence` (la ronda-robin completa
    del nivel, no solo lo que el front muestra en "Sigue en tu ruta"). Antes se
    recortaba a la ventana visible (`window`), lo que dejaba fuera el checkpoint
    de cualquier pilar que no cupiera en los primeros ~8 pasos — con varios
    pilares en curso (Carrera + Propósito, etc.) eso escondía casi todos los
    hitos salvo el más cercano. Ordenados por dónde caen en la secuencia."""
    order = {s.unit_id: i for i, s in enumerate(sequence)}
    candidates = _milestone_groups(units, completed_ids, sequence)
    if not candidates:
        return []

    def badge_code(kind: str, key: tuple[str, str]) -> str:
        dim, second = key
        prefix = "pillar" if kind == "area" else "level"
        return f"{prefix}-{dim}-{second}".lower()

    codes = {badge_code(kind, key) for kind, key, _ in candidates}
    badges = {
        b.code: b for b in db.scalars(select(Badge).where(Badge.code.in_(codes))).all()
    }
    # Peso del assessment por dimensión: si es > 0, terminar las units no basta
    # para el badge de nivel.
    assessment_weighted = {
        c.dimension_code
        for c in db.scalars(select(DimensionScoringConfig)).all()
        if c.assessment_weight > 0
    }

    out: list[PathMilestone] = []
    for kind, key, pending in candidates:
        anchor = max(pending, key=lambda u: order[u.id])
        index = order[anchor.id]
        code = badge_code(kind, key)
        badge = badges.get(code)
        if badge is None:
            continue  # sin fila de catálogo no hay insignia que prometer
        dim, second = key
        cp = career_path_for_dimension(dim) or dim
        out.append(
            PathMilestone(
                kind=kind,
                after_unit_id=anchor.id,
                title=(
                    f"Área completa · {pillar_display_name(dim, second)}"
                    if kind == "area"
                    else f"Nivel {second.replace('L', '')} completo"
                ),
                dimension_code=dim,
                career_path_code=cp,
                pillar_code=second if kind == "area" else None,
                level_code=None if kind == "area" else second,
                badge_code=badge.code,
                badge_name=badge.name,
                badge_icon_url=badge.icon_url,
                units_remaining=len(pending),
                requires_assessment=kind == "level" and dim in assessment_weighted,
                sequence_position=index,
            )
        )
    out.sort(key=lambda m: (order[m.after_unit_id], 0 if m.kind == "area" else 1))
    return out


def build_path(db: Session, user_id: uuid.UUID, upcoming_n: int = 8) -> PathResult:
    user = db.get(User, user_id)
    if user is None:
        raise ValueError(f"user {user_id} not found")
    units = list(
        db.scalars(
            select(LearningUnit).where(
                LearningUnit.published_at.isnot(None),
                LearningUnit.superseded_by_unit_id.is_(None),
                visible_units_predicate(user),  # gating por Área de la Empresa (TASK 8)
            )
        ).all()
    )
    completed_ids = set(
        db.scalars(
            select(LearningUnitAttempt.unit_id).where(
                LearningUnitAttempt.user_id == user_id,
                LearningUnitAttempt.completed_at.isnot(None),
            )
        ).all()
    )

    # Nombres + orden de los 6 pilares.
    paths = {p.code: p for p in db.scalars(select(CareerPath)).all()}

    # Score por career_path desde el último assessment (para priorizar).
    results = latest_dimension_results(db, user_id)
    score_by_cp: dict[str, float] = {}
    for r in results:
        pcp = _career_path_for_dimension(r.dimension_code.value)
        score_by_cp[pcp] = min(score_by_cp.get(pcp, 1.0), _dimension_score(r))

    # dimensions_progress por career_path (dimensión Drive → career_path).
    prog: dict[str, DimensionProgress] = {}
    for u in units:
        cp = career_path_for_dimension(u.dimension_code)
        if cp is None:
            continue
        dp = prog.get(cp)
        if dp is None:
            name = paths[cp].name if cp in paths else cp
            dp = DimensionProgress(career_path_code=cp, name=name, completed=0, total=0)
            prog[cp] = dp
        dp.total += 1
        if u.id in completed_ids:
            dp.completed += 1
    dimensions_progress = sorted(
        prog.values(), key=lambda d: paths[d.career_path_code].order_index if d.career_path_code in paths else 99
    )

    # current_level: nivel más bajo con units pendientes.
    pending = [u for u in units if u.id not in completed_ids]
    if not pending:
        return PathResult(None, None, [], 0, 0, dimensions_progress)
    current_level_num = min(_level_num(u.level_code) for u in pending)
    current_level = f"L{current_level_num}"

    level_units = [u for u in units if _level_num(u.level_code) == current_level_num]
    completed_this_level = sum(1 for u in level_units if u.id in completed_ids)
    total_this_level = len(level_units)

    level_pending = [u for u in level_units if u.id not in completed_ids]

    # Agrupar pendientes por career_path, ordenar dentro por (pilar, número).
    # "AI" (Foundation) siempre al final del pilar — sin `pillar_rank`, "AI"
    # ordenaba primero (alfabéticamente antes que "P1") y el motor terminaba
    # RECOMENDANDO módulos de IA antes que el resto de Carrera.
    by_cp: dict[str, list[LearningUnit]] = {}
    for u in level_pending:
        cp = career_path_for_dimension(u.dimension_code) or u.dimension_code
        by_cp.setdefault(cp, []).append(u)
    for lst in by_cp.values():
        lst.sort(key=lambda u: (pillar_rank(u.pillar_code), u.pillar_code or "", u.unit_number or 0))

    # Prioridad a CP (Carrera): se alterna 1:1 un curso de CP con uno del resto,
    # tomando el resto en orden de menor score primero (la dimensión que más
    # necesita trabajo), y así sucesivamente. Con solo CP publicado, la secuencia
    # es toda CP; sin CP, es el resto por menor score.
    cp_code = career_path_for_dimension("CP") or "P1"
    rest_cps = sorted(
        (cp for cp in by_cp if cp != cp_code),
        key=lambda cp: (score_by_cp.get(cp, 0.5), paths[cp].order_index if cp in paths else 99),
    )
    track_cp = [_to_step(u, cp_code) for u in by_cp.get(cp_code, [])]
    track_rest = [_to_step(u, cp) for cp in rest_cps for u in by_cp[cp]]
    sequence = _interleave([track_cp, track_rest])

    # Un módulo YA EN CURSO siempre gana el primer lugar — es lo que "Módulos"
    # abre (retomar antes que recomendar algo nuevo, ver
    # `ModulosLauncher`/`ModuloDetailView` en el front). Sin esto, `next_step`
    # podía recomendar una unit distinta a la que el colaborador ya empezó,
    # mostrando un "módulo de hoy" que no coincidía con lo que Módulos abría.
    in_progress_ids = list(
        db.scalars(
            select(LearningUnitAttempt.unit_id).where(
                LearningUnitAttempt.user_id == user_id,
                LearningUnitAttempt.started_at.isnot(None),
                LearningUnitAttempt.completed_at.is_(None),
            ).order_by(LearningUnitAttempt.started_at.desc())
        ).all()
    )
    seq_by_unit = {s.unit_id: i for i, s in enumerate(sequence)}
    resume_idx = next((seq_by_unit[uid] for uid in in_progress_ids if uid in seq_by_unit), None)
    if resume_idx is not None and resume_idx != 0:
        sequence.insert(0, sequence.pop(resume_idx))

    next_step = sequence[0] if sequence else None
    upcoming = sequence[1 : 1 + upcoming_n]
    milestones = _build_milestones(db, units, completed_ids, sequence)
    return PathResult(
        current_level=current_level,
        next_step=next_step,
        upcoming=upcoming,
        completed_this_level=completed_this_level,
        total_this_level=total_this_level,
        dimensions_progress=dimensions_progress,
        milestones=milestones,
    )


def _to_step(u: LearningUnit, career_path_code: str) -> PathStep:
    mins = round(u.estimated_duration_seconds / 60) if u.estimated_duration_seconds else None
    return PathStep(
        unit_id=u.id,
        slug=u.slug,
        title=u.title,
        dimension_code=u.dimension_code,
        career_path_code=career_path_code,
        level_code=u.level_code,
        pillar_code=u.pillar_code,
        estimated_minutes=mins,
    )
