"""Parser del código de unidad del Drive (TASK 1 · fixes módulos).

Espejo de los tests de ``unitCode.ts`` para garantizar paridad front/back.
"""
from __future__ import annotations

import pytest

from hg.modules.learning_units.unit_code import (
    UnitCode,
    format_unit_code,
    is_valid_unit_code,
    parse_unit_code,
)


def test_parses_canonical_code() -> None:
    assert parse_unit_code("CP-L1-P2-001") == UnitCode("CP", 1, 2, 1)


def test_strips_padding_from_numbers() -> None:
    assert parse_unit_code("CP-L1-P4-004").number == 4  # type: ignore[union-attr]


def test_accepts_three_char_dimension_and_two_digit_parts() -> None:
    assert parse_unit_code("PRO-L10-P12-045") == UnitCode("PRO", 10, 12, 45)


def test_case_insensitive_and_trims() -> None:
    assert parse_unit_code("  cp-l1-p2-001 ") == UnitCode("CP", 1, 2, 1)


def test_handles_unit_number_over_999() -> None:
    assert parse_unit_code("CP-L1-P1-1000").number == 1000  # type: ignore[union-attr]


@pytest.mark.parametrize(
    "bad",
    ["", "CP-L1-P2", "CPL1P2001", "C-L1-P2-001", "CP-1-P2-001", "CP-L1-2-001", "p2-l1-001"],
)
def test_returns_none_for_malformed(bad: str) -> None:
    assert parse_unit_code(bad) is None
    assert is_valid_unit_code(bad) is False


def test_format_round_trips_and_pads() -> None:
    assert format_unit_code(UnitCode("CP", 1, 2, 1)) == "CP-L1-P2-001"


def test_format_does_not_truncate_over_999() -> None:
    assert format_unit_code(UnitCode("CP", 1, 1, 1000)) == "CP-L1-P1-1000"
