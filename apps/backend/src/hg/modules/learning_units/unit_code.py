"""Parser oficial del código de unidad del Drive (TASK 1 · fixes módulos).

Convención (fuente de verdad = nombre de carpeta del Drive):
    ``<DIM>-L<nivel>-P<pilar>-<seq>``   ej. ``CP-L1-P2-001``

Separa los 4 conceptos que antes se mezclaban: ``dimension`` (CP…, la
dimensión), ``level`` (nivel), ``pillar`` (sub-categoría P<n> = el pilar, va a
``LearningUnit.pillar_number``) y ``number`` (correlativo).
Espejo exacto de ``apps/frontend/src/lib/parsers/unitCode.ts``.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

_UNIT_CODE_RE = re.compile(r"^([A-Z]{2,3})-L(\d{1,2})-P(\d{1,2})-(\d{1,4})$")


@dataclass(frozen=True)
class UnitCode:
    dimension: str
    level: int
    pillar: int
    number: int


def parse_unit_code(code: str) -> UnitCode | None:
    """``CP-L1-P2-001`` → ``UnitCode(dimension="CP", level=1, pillar=2, number=1)``.

    Devuelve ``None`` si el string no respeta la convención (para que el sync
    lo reporte en vez de importar mal silenciosamente).
    """
    m = _UNIT_CODE_RE.match(code.strip().upper())
    if not m:
        return None
    return UnitCode(
        dimension=m.group(1), level=int(m.group(2)), pillar=int(m.group(3)), number=int(m.group(4))
    )


def is_valid_unit_code(code: str) -> bool:
    return parse_unit_code(code) is not None


def format_unit_code(unit: UnitCode) -> str:
    """Reconstruye el código canónico; ``number`` se rellena a 3 dígitos (001)."""
    return f"{unit.dimension.upper()}-L{unit.level}-P{unit.pillar}-{unit.number:03d}"
