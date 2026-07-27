"""Registro de dimensiones del Drive ↔ career paths de la app (TASK 1).

`dimension_code` guarda el código del Drive (``CP``, …). La personalización de
la app (enrollments, radar, `/path`) usa los códigos de career_path (``P1..P6``).
Este registro puentea ambos. Hoy solo existe la dimensión CP (Carrera).

Cuando Jorge agregue las otras 5 dimensiones al Drive, se añaden acá su código
Drive + el career_path equivalente (una sola línea por dimensión).
"""
from __future__ import annotations

# Drive dimension code → career_path code (P1..P6) de la app.
DRIVE_TO_CAREER_PATH: dict[str, str] = {
    "CP": "P1",  # Carrera Profesional → Carrera e impacto
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
