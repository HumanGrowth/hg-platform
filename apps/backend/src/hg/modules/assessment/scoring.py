"""Score numérico 0-100 de un estado del assessment (Capa Empresa · TASK 6).

Fuente ÚNICA del mapeo estado→valor (antes vivía en el frontend
``assessment-utils.ts`` ``STATE_TO_VALUE``; el radar ahora lee el valor
persistido que se deriva de acá). El estado categórico sigue siendo la verdad;
este valor solo lo posiciona 0-100 para el completion de badges y el radar.

Los códigos son los ``state_code`` por dimensión del motor de assessment. La
dimensión **Estabilidad (ES)** se compone de 2 instrumentos internos (P6A
Resiliencia + P6B Finanzas) → su valor de dimensión es el **promedio** de ambos
(ver ``dimension_value_from_results``).
"""
from __future__ import annotations

from collections.abc import Iterable

# state_code → valor 0-100. Espejo del STATE_TO_VALUE del frontend.
STATE_TO_VALUE: dict[str, int] = {
    # P1 PMM (niveles L1..L6)
    "L1": 17, "L2": 33, "L3": 50, "L4": 67, "L5": 83, "L6": 100,
    # P2 Damon (propósito)
    "Latente": 25, "Explorador": 50, "Direccionado": 75, "Integrado": 100,
    # P3 / P5 (relaciones / paz interior)
    "N1": 25, "N2": 50, "N3": 75, "N4": 100,
    # P4 Prochaska (salud, etapas de cambio)
    "E1": 20, "E2": 40, "E3": 60, "E4": 80, "E5": 100,
    # P6A resiliencia (CD-RISC)
    "Baja": 33, "Media": 66, "Alta": 100,
    # P6B finanzas (CFPB)
    "Frágil": 33, "Vulnerable": 66, "Estable": 100,
}


# Dimensión de producto (CP/PR/RE/SA/PI/ES) → código(s) del assessment
# (DimensionResult.dimension_code). ES = 2 instrumentos internos (P6A+P6B) que se
# promedian; el resto es 1:1.
DIMENSION_TO_ASSESSMENT_CODES: dict[str, list[str]] = {
    "CP": ["P1"], "PR": ["P2"], "RE": ["P3"],
    "SA": ["P4"], "PI": ["P5"], "ES": ["P6A", "P6B"],
}

# Las 6 dimensiones de producto (orden canónico del radar).
PRODUCT_DIMENSIONS: tuple[str, ...] = ("CP", "PR", "RE", "SA", "PI", "ES")


def state_to_value(state_code: str | None) -> float:
    """Valor 0-100 de un ``state_code``. Desconocido/None → 0.0."""
    if state_code is None:
        return 0.0
    return float(STATE_TO_VALUE.get(state_code, 0))


def dimension_value_from_states(state_codes: Iterable[str | None]) -> float:
    """Valor 0-100 de una dimensión a partir de sus estados. Con más de uno
    (Estabilidad = P6A+P6B) devuelve el **promedio**; sin ninguno → 0.0."""
    values = [state_to_value(s) for s in state_codes if s is not None]
    if not values:
        return 0.0
    return round(sum(values) / len(values), 1)
