"""Parser oficial del código de unidad del Drive (TASK 1 · fixes módulos).

Convención (fuente de verdad = nombre de carpeta del Drive):
    ``[<AREA>-]<DIM>-L<nivel>-<PILAR>-<seq>``   ej. ``MFG-CP-L1-P2-001``

El segmento **``<AREA>``** (Capa Empresa · TASK 8) es OPCIONAL: si falta, o si
es el centinela ``GEN``, la unit es **general** (``area_code = None``, visible a
todas las empresas). Ej.: ``CP-L1-P2-001`` y ``GEN-CP-L1-P2-001`` → area=None.

El **``<PILAR>``** es el penúltimo grupo antes del número de unidad y va como
**código string** (CE-07): numerado (``P1``…``P5``) o nombrado (``AI`` para
Inteligencia Artificial; ``IA`` se normaliza a ``AI``). Se mapea a
``pillar_code``.

Separa los 5 conceptos: ``area`` (MFG/IT/CC o None=general), ``dimension``
(CP…), ``level``, ``pillar`` (código P<n>/AI…) y ``number``. Espejo de
``apps/frontend/src/lib/parsers/unitCode.ts``.
"""
from __future__ import annotations

import re
from dataclasses import dataclass

# Prefijo de Área opcional; pilar = `P<n>` o código de letras (AI, ETH…):
# `(<AREA>-)?<DIM>-L<n>-<PILAR>-<seq>`.
_UNIT_CODE_RE = re.compile(
    r"^(?:([A-Z]{2,3})-)?([A-Z]{2,3})-L(\d{1,2})-(P\d{1,2}|[A-Z]{2,4})-(\d{1,4})$"
)
_GENERAL_SENTINEL = "GEN"
# Alias de pilares nombrados → código canónico (IA y AI son el mismo pilar).
_PILLAR_ALIASES = {"IA": "AI"}


def normalize_pillar(segment: str) -> str:
    """Normaliza el segmento de pilar a su código canónico (uppercase; IA→AI)."""
    up = segment.strip().upper()
    return _PILLAR_ALIASES.get(up, up)


@dataclass(frozen=True)
class UnitCode:
    dimension: str
    level: int
    pillar: str  # código del pilar: "P1".."P5", "AI"… (CE-07)
    number: int
    area: str | None = None  # MFG/IT/CC o None (general)


def parse_unit_code(code: str) -> UnitCode | None:
    """``MFG-CP-L1-P2-001`` → ``UnitCode(area="MFG", dimension="CP", level=1,
    pillar="P2", number=1)``. Sin Área (o ``GEN``) → ``area=None`` (general).
    ``CP-L1-IA-015`` → ``pillar="AI"``.

    Devuelve ``None`` si el string no respeta la convención (para que el sync lo
    reporte en vez de importar mal silenciosamente).
    """
    m = _UNIT_CODE_RE.match(code.strip().upper())
    if not m:
        return None
    area = m.group(1)
    if area == _GENERAL_SENTINEL:
        area = None
    return UnitCode(
        area=area, dimension=m.group(2), level=int(m.group(3)),
        pillar=normalize_pillar(m.group(4)), number=int(m.group(5)),
    )


def is_valid_unit_code(code: str) -> bool:
    return parse_unit_code(code) is not None


def format_unit_code(unit: UnitCode) -> str:
    """Reconstruye el código canónico; ``number`` se rellena a 3 dígitos (001).
    Antepone el Área si la unit no es general."""
    prefix = f"{unit.area.upper()}-" if unit.area else ""
    return f"{prefix}{unit.dimension.upper()}-L{unit.level}-{unit.pillar}-{unit.number:03d}"
