"""Registro de dimensiones del Drive ↔ career paths de la app.

Convención de naming del Drive: ``Dimensión-Nivel-Pilar-Número`` (``CP-L1-P2-001``).
- **Dimensión** (``dimension_code``: CP/PR/RE/SA/PI/ES) = el nivel superior — los
  6 pilares/dimensiones de la app (radar, `/path`, `/modulos`). ES lo que agrupa.
- **Pilar** (``pillar_code``) = un sub-grupo DENTRO de la dimensión, no una
  dimensión propia. Solo se usa para ordenar dentro de una dimensión.

La app usa códigos de career_path (``P1..P6``); este registro los puentea con las
dimensiones Drive. Hoy solo hay contenido de la dimensión **CP (Carrera)** en la
DB → todas las units publicadas viven bajo Carrera (P1); el resto de dimensiones
quedan vacías hasta que Jorge las suba al Drive.
"""
from __future__ import annotations

# Drive dimension code → career_path code (P1..P6) de la app. LA agrupación de
# módulos es por acá (dimension_code), NO por pillar_code.
DRIVE_TO_CAREER_PATH: dict[str, str] = {
    "CP": "P1",  # Carrera Profesional
    "PR": "P2",  # Propósito y Significado
    "RE": "P3",  # Relaciones y Conexiones
    "SA": "P4",  # Salud y Bienestar
    "PI": "P5",  # Paz Interior
    "ES": "P6",  # Estabilidad
}

# Inverso: career_path code → códigos Drive que le corresponden.
_CAREER_PATH_TO_DRIVE: dict[str, list[str]] = {}
for _drive, _cp in DRIVE_TO_CAREER_PATH.items():
    _CAREER_PATH_TO_DRIVE.setdefault(_cp, []).append(_drive)


def career_path_for_dimension(dimension_code: str) -> str | None:
    """Career path (P1..P6) de una dimensión Drive; ``None`` si no está mapeada."""
    return DRIVE_TO_CAREER_PATH.get(dimension_code.upper())


def dimensions_for_career_paths(career_path_codes: list[str]) -> list[str]:
    """Códigos Drive que corresponden a un conjunto de career paths (P1..P6)."""
    out: list[str] = []
    for cp in career_path_codes:
        out.extend(_CAREER_PATH_TO_DRIVE.get(cp, []))
    return out
