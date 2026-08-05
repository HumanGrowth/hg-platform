"""Registro de dimensiones del Drive ↔ career paths de la app (TASK 1).

`dimension_code` guarda el código del Drive (``CP``, …). La personalización de
la app (enrollments, radar, `/path`) usa los códigos de career_path (``P1..P6``).
Este registro puentea ambos. Hoy solo existe la dimensión CP (Carrera).

Cuando Jorge agregue las otras 5 dimensiones al Drive, se añaden acá su código
Drive + el career_path equivalente (una sola línea por dimensión).
"""
from __future__ import annotations

# NUEVA CONVENCIÓN (cierre-beta TASK 0):
# La agrupación de módulos en la app es por `pillar_number` (1..6) a nivel UNIT,
# NO por `dimension_code`. La dimensión Drive (CP/PR/RE/SA/PI/ES) es puramente
# organizativa del Drive y NO se usa para agrupar. Cada unit trae su `pillar_number`
# parseado del nombre de carpeta (`CP-L1-P2-001` → pillar 2), y así se distribuye
# a su pilar aunque su dimensión Drive sea otra. Ver `pillar_number_for_career_path`.

# @deprecated para agrupar/listar módulos — quedó solo para el feed personalizado
# por enrollment (`_select_feed_units`), que TASK 1 (Mi Ruta) revisará. No usar
# para nuevos listados: usar `pillar_number_for_career_path`.
# Drive dimension code → career_path code (P1..P6) de la app.
DRIVE_TO_CAREER_PATH: dict[str, str] = {
    "CP": "P1",  # Carrera Profesional → Carrera e impacto
}


def pillar_number_for_career_path(pillar_code: str) -> int | None:
    """``P1``..``P6`` → ``1``..``6`` (el `pillar_number` de las units). ``None`` si
    el código no tiene la forma esperada. Fuente de agrupación de módulos en la app."""
    code = pillar_code.strip().upper()
    if len(code) == 2 and code[0] == "P" and code[1].isdigit() and 1 <= int(code[1]) <= 6:
        return int(code[1])
    return None

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
