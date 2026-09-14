"""Escala 1..3 → valor 0-100 de la evaluación del manager (FASE 1.1).

Fuente única del mapeo — reusado por el motor de score (``badges/progression.py``)
y por los endpoints de la matriz (FASE 1.2), igual que ``assessment/scoring.py``
es la fuente única del mapeo estado→valor del assessment.
"""
from __future__ import annotations

SIN_DEMOSTRAR = 1
EN_PROGRESO = 2
DEMOSTRANDO = 3

RATING_TO_VALUE: dict[int, float] = {
    SIN_DEMOSTRAR: 0.0,
    EN_PROGRESO: 50.0,
    DEMOSTRANDO: 100.0,
}


def rating_to_value(rating: int | None) -> float | None:
    """Valor 0-100 de un ``rating`` 1..3. ``None``/desconocido → ``None``."""
    if rating is None:
        return None
    return RATING_TO_VALUE.get(rating)
