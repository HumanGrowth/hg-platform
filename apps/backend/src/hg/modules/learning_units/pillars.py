"""Nombres de los PILARES (áreas de crecimiento) dentro de una dimensión.

El ``pillar_code`` de una unit es un sub-grupo DENTRO de la dimensión, y su
convención cambia según la dimensión (ver ``unit_code.py`` y el sync del Drive):

- **Carrera (CP)**: pilares temáticos ``P1``..``P5`` = las 5 competencias del
  modelo PMM, más ``AI`` (Foundation, va siempre último).
- **Propósito (PR) / Relaciones (RE)**: el nivel es constante y lo que varía es
  el **estado** (``V0``..``V6``). En el Drive los folders de estado se llaman
  ``V1 - Latente``: el nombre real vive en el Drive, no acá.

Este registro es la fuente de verdad del nombre visible del área (lo usa el
catálogo de badges). Espejo de ``SUB_PILLAR_NAMES`` en
``apps/frontend/src/lib/dimension-styles.ts`` — si cambiás uno, cambiá el otro.

TODO(contenido): completar los estados ``V*`` de Propósito y Relaciones con los
nombres reales de los folders del Drive. Hasta entonces caen al fallback
"Etapa V<n>", que es legible pero genérico.
"""
from __future__ import annotations

import re

PILLAR_NAMES: dict[str, dict[str, str]] = {
    "CP": {
        "P1": "Adaptabilidad de aprendizaje",
        "P2": "Excelencia operativa y colaboración",
        "P3": "Experticia y pensamiento estratégico",
        "P4": "Comunicación e influencia",
        "P5": "Inteligencia emocional y social",
        "AI": "Inteligencia artificial aplicada",
    },
}

_NUMBERED_RE = re.compile(r"^P(\d+)$")
_STATE_RE = re.compile(r"^V(\d+)$")


def pillar_display_name(dimension_code: str, pillar_code: str) -> str:
    """Nombre visible del área. Sin entrada en el registro cae a un fallback
    legible según la convención del código (``P3`` → "Pilar 3", ``V1`` → "Etapa
    V1", ``AI`` → "Inteligencia artificial")."""
    dim = (dimension_code or "").upper()
    pillar = (pillar_code or "").upper()

    named = PILLAR_NAMES.get(dim, {}).get(pillar)
    if named:
        return named

    numbered = _NUMBERED_RE.match(pillar)
    if numbered:
        return f"Pilar {numbered.group(1)}"
    if _STATE_RE.match(pillar):
        return f"Etapa {pillar}"
    if pillar == "AI":
        return "Inteligencia artificial"
    return pillar or "Área"
