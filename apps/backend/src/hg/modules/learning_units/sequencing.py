"""Secuencia de módulos de un usuario: orden de convención + nivel según el score
+ desbloqueo. ÚNICA fuente de verdad de "qué sigue" y "qué puede abrir".

Lo usan el motor de "Mi Ruta" (`path_engine`), el feed de `/modulos`, el listado
por dimensión y la validación de acceso a una unit (`router`).

**Orden de convención** (código de unidad del Drive ``Dim-Nivel-Pilar-Número``,
ver ``unit_code.py``): dentro de una dimensión, nivel ↑ → pilar ↑ (``AI`` último,
numerado o estado ``V0..V5`` por su número) → número de unidad ↑.

**Nivel del usuario según el score (piso Y tope).** La dimensión Carrera (CP) es
la única con escala de nivel en el assessment (``L1..L6``, general = eslabón más
débil de las 5 competencias); el contenido del Drive tiene niveles ``L1..L3``. La
equivalencia (:data:`ASSESSMENT_TO_CONTENT_LEVEL`) es DE A PARES — validar con
Jorge; es un único dict editable. Sin assessment el nivel es L1; las demás
dimensiones no tienen escala de nivel en el assessment y también son L1. Si el
nivel del score supera el contenido publicado, se usa el más alto que exista.

- Se RECORRE solo el contenido del nivel del usuario, en orden de convención.
- Los niveles por DEBAJO son opcionales: siempre disponibles (repaso) y siguen
  sumando a sus badges, pero no forman parte de la ruta.
- Los niveles por ENCIMA están bloqueados: se abren cuando el score sube al
  reevaluarse, no por completar módulos.

**Orden estricto con excepciones.** Un colaborador/manager solo puede abrir, en
su nivel, la primera unit pendiente de cada dimensión. Se permiten siempre: las
ya completadas (repaso), las que están en curso, y las que un manager le asignó o
vienen de su ruta personalizada. Con inscripciones activas (``Enrollment``) la
ruta solo recorre esas dimensiones. Los roles que no son de aprendizaje (admin,
company_admin, superadmin) no se restringen.
"""
from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from hg.modules.assessment.service import latest_dimension_results
from hg.modules.identity.models import User, UserRole
from hg.modules.learning.models import CareerPath, Enrollment
from hg.modules.learning_units.area_access import visible_units_predicate
from hg.modules.learning_units.dimensions import dimensions_for_career_paths
from hg.modules.learning_units.models import (
    LearningUnit,
    LearningUnitAttempt,
    ModuleAssignment,
)
from hg.modules.learning_units.onboarding import ONBOARDING_DIMENSION_CODE
from hg.modules.learning_units.pillars import pillar_rank
from hg.modules.paths.resolution import custom_path_unit_order, resolve_custom_path

# Nivel del assessment de Carrera (L1..L6) → nivel de contenido (L1..L3).
# De a pares. Editar acá si Jorge define otra equivalencia.
ASSESSMENT_TO_CONTENT_LEVEL: dict[int, int] = {1: 1, 2: 1, 3: 2, 4: 2, 5: 3, 6: 3}

# Dimensión de contenido cuyo assessment trae escala de nivel, y su código de assessment.
LEVELED_DIMENSION = "CP"
LEVELED_ASSESSMENT_CODE = "P1"

# Roles a los que se les aplica el orden estricto (los que aprenden).
ENFORCED_ROLES = {UserRole.collaborator, UserRole.manager}

# Razones de bloqueo (se exponen tal cual al frontend).
LOCK_ORDER = "order"  # hay una unit anterior de tu nivel sin completar
LOCK_LEVEL = "level"  # nivel por encima del tuyo: sube con la reevaluación
LOCK_SCOPE = "scope"  # dimensión fuera de las inscripciones del usuario

_LEVEL_RE = re.compile(r"L(\d+)")
_PILLAR_RE = re.compile(r"^([A-Z]*)(\d*)$")


def level_num(level_code: str | None) -> int:
    m = _LEVEL_RE.search(level_code or "")
    return int(m.group(1)) if m else 99


def content_level_from_assessment(state_code: str | None) -> int:
    """Nivel de contenido (1..3) para un ``state_code`` de Carrera (``L1``..``L6``).
    Sin assessment o estado desconocido → 1."""
    m = _LEVEL_RE.fullmatch(state_code or "")
    if m is None:
        return 1
    return ASSESSMENT_TO_CONTENT_LEVEL.get(int(m.group(1)), 1)


def pillar_sort_key(pillar_code: str | None) -> tuple[int, str, int]:
    """Orden natural de un pilar: ``AI`` al final; ``P2`` < ``P10``; ``V0`` < ``V1``."""
    code = (pillar_code or "").upper()
    m = _PILLAR_RE.match(code)
    letters, digits = (m.group(1), int(m.group(2) or 0)) if m else (code, 0)
    return (pillar_rank(code), letters, digits)


def unit_sort_key(u: LearningUnit) -> tuple:
    """Orden de convención del Drive dentro de una dimensión."""
    return (level_num(u.level_code), *pillar_sort_key(u.pillar_code), u.unit_number or 0, u.slug)


@dataclass
class UnitSequence:
    """Plan de secuencia de UN usuario (se arma una vez por request)."""

    ordered_by_dim: dict[str, list[LearningUnit]]
    start_level: dict[str, int]
    completed_ids: set[uuid.UUID]
    in_progress_ids: set[uuid.UUID]
    exception_ids: set[uuid.UUID]
    enrolled_dims: set[str] | None  # None = sin inscripciones → todas las dimensiones
    _by_id: dict[uuid.UUID, LearningUnit] = field(default_factory=dict, repr=False)

    def in_scope(self, dimension_code: str) -> bool:
        return self.enrolled_dims is None or dimension_code in self.enrolled_dims

    def required(self, dimension_code: str) -> list[LearningUnit]:
        """Units que forman la ruta de la dimensión: las de SU nivel, en orden."""
        level = self.start_level.get(dimension_code, 1)
        return [u for u in self.ordered_by_dim.get(dimension_code, []) if level_num(u.level_code) == level]

    def pending_required(self, dimension_code: str) -> list[LearningUnit]:
        return [u for u in self.required(dimension_code) if u.id not in self.completed_ids]

    def next_unit(self, dimension_code: str) -> LearningUnit | None:
        pending = self.pending_required(dimension_code)
        return pending[0] if pending else None

    def current_level(self, dimension_code: str) -> int | None:
        """Nivel en curso: el del usuario, mientras le queden pendientes en él."""
        return self.start_level.get(dimension_code, 1) if self.pending_required(dimension_code) else None

    def candidates(self, dimension_code: str) -> list[LearningUnit]:
        """Pendientes de su nivel en la dimensión, en orden de convención."""
        return self.pending_required(dimension_code)

    def level_units(self, dimension_code: str) -> list[LearningUnit]:
        """TODAS las units de su nivel (completadas o no)."""
        return self.required(dimension_code) if self.pending_required(dimension_code) else []

    def lock_reason(self, user: User, unit: LearningUnit) -> str | None:
        """Por qué ``user`` NO puede abrir ``unit`` todavía (None = puede)."""
        if user.role not in ENFORCED_ROLES:
            return None
        dim = unit.dimension_code
        if dim == ONBOARDING_DIMENSION_CODE or unit.id not in self._by_id:
            return None  # onboarding tiene su propio gate; fuera de plan = sin restricción extra
        if unit.id in self.completed_ids or unit.id in self.in_progress_ids or unit.id in self.exception_ids:
            return None
        if not self.in_scope(dim):
            return LOCK_SCOPE
        level = self.start_level.get(dim, 1)
        unit_level = level_num(unit.level_code)
        if unit_level < level:
            return None  # nivel por debajo del suyo: opcional, siempre disponible
        if unit_level > level:
            return LOCK_LEVEL
        nxt = self.next_unit(dim)
        return None if nxt is not None and nxt.id == unit.id else LOCK_ORDER

    def is_locked(self, user: User, unit: LearningUnit) -> bool:
        return self.lock_reason(user, unit) is not None


def build_sequence(db: Session, user: User) -> UnitSequence:
    units = list(
        db.scalars(
            select(LearningUnit).where(
                LearningUnit.published_at.isnot(None),
                LearningUnit.superseded_by_unit_id.is_(None),
                LearningUnit.dimension_code != ONBOARDING_DIMENSION_CODE,  # track aparte
                visible_units_predicate(user),  # gating por Área de la Empresa
            )
        ).all()
    )
    ordered: dict[str, list[LearningUnit]] = {}
    for u in units:
        ordered.setdefault(u.dimension_code, []).append(u)
    for lst in ordered.values():
        lst.sort(key=unit_sort_key)

    attempts = db.execute(
        select(LearningUnitAttempt.unit_id, LearningUnitAttempt.completed_at, LearningUnitAttempt.started_at)
        .where(LearningUnitAttempt.user_id == user.id)
    ).all()
    completed = {uid for uid, done, _ in attempts if done is not None}
    in_progress = {uid for uid, done, started in attempts if done is None and started is not None}

    # Nivel de partida por dimensión (solo Carrera tiene escala de nivel en el assessment).
    start: dict[str, int] = {}
    results = latest_dimension_results(db, user.id)
    career = next((r for r in results if r.dimension_code.value == LEVELED_ASSESSMENT_CODE), None)
    for dim, lst in ordered.items():
        wanted = content_level_from_assessment(career.state_code) if dim == LEVELED_DIMENSION and career else 1
        max_level = max(level_num(u.level_code) for u in lst)
        start[dim] = max(1, min(wanted, max_level))  # sin contenido a ese nivel → el más alto que exista

    # Excepciones: lo asignado por un manager/admin y la ruta personalizada.
    exceptions = set(
        db.scalars(select(ModuleAssignment.learning_unit_id).where(ModuleAssignment.user_id == user.id)).all()
    )
    custom = resolve_custom_path(db, user)
    if custom is not None:
        exceptions.update(custom_path_unit_order(db, custom.id))

    # Inscripciones activas → dimensiones de la ruta.
    enrolled_codes = list(
        db.scalars(
            select(CareerPath.code)
            .join(Enrollment, Enrollment.career_path_id == CareerPath.id)
            .where(Enrollment.user_id == user.id, Enrollment.is_active.is_(True))
        ).all()
    )
    enrolled_dims = set(dimensions_for_career_paths(enrolled_codes)) if enrolled_codes else None
    if enrolled_dims is not None and not enrolled_dims:
        enrolled_dims = None  # ninguna mapea → mejor mostrar algo que nada

    return UnitSequence(
        ordered_by_dim=ordered,
        start_level=start,
        completed_ids=completed,
        in_progress_ids=in_progress,
        exception_ids=exceptions,
        enrolled_dims=enrolled_dims,
        _by_id={u.id: u for u in units},
    )
