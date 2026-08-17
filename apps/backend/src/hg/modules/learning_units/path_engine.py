"""Motor de recomendación de "Mi Ruta" (cierre-beta TASK 1).

Arma una secuencia recomendada de learning units para el usuario:
- `current_level`: nivel más bajo con units pendientes (arranca L1, avanza al
  completar todas las de ese nivel).
- `next_step` + `upcoming`: units pendientes del nivel actual, ordenadas por
  dimensión (priorizando la de menor score en el último assessment) y alternando
  dimensiones para no cansar; dentro de una dimensión, por pilar y número (orden
  del Drive).
- `dimensions_progress`: completed/total por cada uno de los 6 pilares.

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
from hg.modules.identity.models import User
from hg.modules.learning.models import CareerPath
from hg.modules.learning_units.area_access import visible_units_predicate
from hg.modules.learning_units.dimensions import career_path_for_dimension
from hg.modules.learning_units.models import LearningUnit, LearningUnitAttempt

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


def build_path(db: Session, user_id: uuid.UUID, upcoming_n: int = 5) -> PathResult:
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

    # Agrupar pendientes por career_path, ordenar dentro por (pilar, número),
    # ordenar los grupos por score asc (menor = primero) y alternar.
    by_cp: dict[str, list[LearningUnit]] = {}
    for u in level_pending:
        cp = career_path_for_dimension(u.dimension_code) or u.dimension_code
        by_cp.setdefault(cp, []).append(u)
    for lst in by_cp.values():
        lst.sort(key=lambda u: (u.pillar_code or "", u.unit_number or 0))
    ordered_cps = sorted(
        by_cp.keys(),
        key=lambda cp: (score_by_cp.get(cp, 0.5), paths[cp].order_index if cp in paths else 99),
    )
    groups = [[_to_step(u, cp) for u in by_cp[cp]] for cp in ordered_cps]
    sequence = _interleave(groups)

    next_step = sequence[0] if sequence else None
    upcoming = sequence[1 : 1 + upcoming_n]
    return PathResult(
        current_level=current_level,
        next_step=next_step,
        upcoming=upcoming,
        completed_this_level=completed_this_level,
        total_this_level=total_this_level,
        dimensions_progress=dimensions_progress,
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
