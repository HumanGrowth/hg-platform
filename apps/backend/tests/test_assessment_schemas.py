"""Contrato de códigos del assessment (M3).

Documenta por qué un **career-path** como ``P6`` produce 422 y previene la
regresión de mandarlo en ``target_dimension``. Hay dos espacios de códigos que
se cruzan en la app:

- **assessment**: ``P1``..``P5``, ``P6A``, ``P6B`` (este schema).
- **career-path / Drive**: ``P1``..``P6`` / ``CP``.. (otro espacio).

El frontend debe mandar el código del **assessment** (``assessmentDimension`` en
``apps/frontend/src/lib/dimensions.ts``), no el career-path. Para Estabilidad,
``P6`` (career-path) → ``P6A`` (assessment).
"""
from __future__ import annotations

from uuid import uuid4

import pytest
from pydantic import ValidationError

from hg.modules.assessment.schemas import ResponseIn, SessionStartIn


@pytest.mark.parametrize("code", ["P1", "P2", "P3", "P4", "P5", "P6A", "P6B"])
def test_session_start_accepts_assessment_codes(code: str) -> None:
    s = SessionStartIn(kind="dimension_detail", target_dimension=code)  # type: ignore[arg-type]
    assert s.target_dimension is not None and s.target_dimension.value == code


def test_session_start_rejects_career_path_p6() -> None:
    # "P6" es career-path (Estabilidad), NO un código del assessment → 422.
    with pytest.raises(ValidationError):
        SessionStartIn(kind="dimension_detail", target_dimension="P6")  # type: ignore[arg-type]


@pytest.mark.parametrize("bad", ["p1", "CP", "ES", "PR"])
def test_session_start_rejects_lowercase_and_drive_codes(bad: str) -> None:
    with pytest.raises(ValidationError):
        SessionStartIn(kind="dimension_detail", target_dimension=bad)  # type: ignore[arg-type]


def test_response_value_coerces_numeric_string_but_rejects_non_numeric() -> None:
    item = uuid4()
    # Pydantic v2 coacciona "3" → 3: por eso mandar el value como string numérico
    # NO era la causa del 422 (contra la hipótesis inicial).
    assert ResponseIn(item_id=item, response_value="3").response_value == 3  # type: ignore[arg-type]
    # Un string no numérico sí falla.
    with pytest.raises(ValidationError):
        ResponseIn(item_id=item, response_value="tres")  # type: ignore[arg-type]
