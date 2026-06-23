"""Scorers individuales (B2-02) — casos alto/bajo por pilar (pure, sin DB)."""
from __future__ import annotations

from uuid import uuid4

from hg.modules.assessment.enums import PillarCode, ResultSource
from hg.modules.assessment.models import AssessmentItem, AssessmentResponse
from hg.modules.assessment.scorers import score_pillar
from hg.modules.assessment.scorers.base import ScoringInput


def _input(pillar: PillarCode, values: dict[str, int]) -> ScoringInput:
    items: dict = {}
    responses: list[AssessmentResponse] = []
    for code, val in values.items():
        iid = uuid4()
        items[iid] = AssessmentItem(id=iid, item_code=code, pillar_code=pillar)
        responses.append(
            AssessmentResponse(id=uuid4(), item_id=iid, response_value=val, session_id=uuid4(), org_id=uuid4())
        )
    return ScoringInput(responses=responses, items=items, source=ResultSource.confirmed)


def test_career_weakest_link() -> None:
    out = score_pillar(PillarCode.P1, _input(PillarCode.P1, {
        "PMM-C1": 4, "PMM-C2": 4, "PMM-C3": 2, "PMM-C4": 4, "PMM-C5": 3,
    }))
    assert out.state_code == "L2"  # MIN
    assert out.sub_scores["C3"] == "L2"
    assert "C3" in (out.suggested_next_step or "")


def test_career_all_high() -> None:
    out = score_pillar(PillarCode.P1, _input(PillarCode.P1, {
        "PMM-C1": 5, "PMM-C2": 5, "PMM-C3": 5, "PMM-C4": 5, "PMM-C5": 5,
    }))
    assert out.state_code == "L5"


def test_purpose_integrado_with_reverse() -> None:
    # presencia alta (incluye 8-MLQ5), búsqueda baja → Integrado
    out = score_pillar(PillarCode.P2, _input(PillarCode.P2, {
        "MLQ-1": 6, "MLQ-2": 6, "MLQ-3": 6, "MLQ-4": 6, "MLQ-5": 2,  # 8-2=6
        "MLQ-6": 2, "MLQ-7": 2, "MLQ-8": 2, "MLQ-9": 2, "MLQ-10": 2,
    }))
    assert out.state_code == "Integrado"
    assert out.sub_scores["presencia"] >= 5.0


def test_purpose_latente() -> None:
    out = score_pillar(PillarCode.P2, _input(PillarCode.P2, {
        "MLQ-1": 2, "MLQ-2": 2, "MLQ-3": 2, "MLQ-4": 2, "MLQ-5": 6,  # presencia baja
        "MLQ-6": 2, "MLQ-7": 2, "MLQ-8": 2, "MLQ-9": 2, "MLQ-10": 2,
    }))
    assert out.state_code == "Latente"


def test_relationships_aislamiento() -> None:
    out = score_pillar(PillarCode.P3, _input(PillarCode.P3, {
        "UCLA-A1": 5, "UCLA-A2": 5, "UCLA-A3": 5,  # soledad 15
        "CAC-B1": 1, "CAC-B2": 1, "CAC-B3": 1, "CAC-B4": 1, "CAC-B5": 1,
    }))
    assert out.state_code == "N1"


def test_relationships_n3_requires_confirmation() -> None:
    out = score_pillar(PillarCode.P3, _input(PillarCode.P3, {
        "UCLA-A1": 1, "UCLA-A2": 1, "UCLA-A3": 1,  # soledad 3
        "CAC-B1": 5, "CAC-B2": 5, "CAC-B3": 5, "CAC-B4": 5, "CAC-B5": 5,
    }))
    assert out.state_code == "N3"
    assert out.requires_user_confirmation is True


def test_health_recaida_when_behavior_contradicts() -> None:
    out = score_pillar(PillarCode.P4, _input(PillarCode.P4, {
        "PRO-1b": 5, "PRO-1a": 0,  # dice E5 pero 0-5 noches → recaída
        "PRO-2b": 5, "PRO-2a": 4,
        "PRO-3b": 5, "PRO-3a": 4,
        "PRO-4b": 5, "PRO-4a": 4,
    }))
    assert out.recaida_detected is True
    assert out.sub_scores["sueno"]["recaida"] is True


def test_health_min_stage() -> None:
    out = score_pillar(PillarCode.P4, _input(PillarCode.P4, {
        "PRO-1b": 3, "PRO-1a": 2,
        "PRO-2b": 1, "PRO-2a": 0,  # E1 → MIN
        "PRO-3b": 4, "PRO-3a": 3,
        "PRO-4b": 5, "PRO-4a": 4,
    }))
    assert out.state_code == "E1"
    assert out.recaida_detected is False


def test_inner_peace_flexible_n4() -> None:
    out = score_pillar(PillarCode.P5, _input(PillarCode.P5, {
        "ERQ-A1": 6, "ERQ-A2": 6, "ERQ-A3": 6, "ERQ-A4": 6, "ERQ-A5": 6, "ERQ-A6": 6,
        "ERQ-A7": 1, "ERQ-A8": 1, "ERQ-A9": 1, "ERQ-A10": 1,
        "AAQ-B1": 1,  # flex = 8-1 = 7 ≥5
    }))
    assert out.state_code == "N4"


def test_inner_peace_reactivo_n1() -> None:
    out = score_pillar(PillarCode.P5, _input(PillarCode.P5, {
        "ERQ-A1": 2, "ERQ-A2": 2, "ERQ-A3": 2, "ERQ-A4": 2, "ERQ-A5": 2, "ERQ-A6": 2,  # reev<3.5
        "ERQ-A7": 6, "ERQ-A8": 6, "ERQ-A9": 6, "ERQ-A10": 6,  # supr≥4.5
        "AAQ-B1": 4,
    }))
    assert out.state_code == "N1"


def test_resilience_alta() -> None:
    out = score_pillar(PillarCode.P6A, _input(PillarCode.P6A, {f"RISC-A{i}": 4 for i in range(1, 11)}))
    assert out.state_code == "Alta"  # 40


def test_resilience_baja() -> None:
    out = score_pillar(PillarCode.P6A, _input(PillarCode.P6A, {f"RISC-A{i}": 1 for i in range(1, 11)}))
    assert out.state_code == "Baja"  # 10


def test_financial_estable_with_reverse() -> None:
    out = score_pillar(PillarCode.P6B, _input(PillarCode.P6B, {
        "CFPB-B1": 4, "CFPB-B2": 5, "CFPB-B3": 5, "CFPB-B4": 1, "CFPB-B5": 4,  # 4+5+5+(6-1)+4=23
    }))
    assert out.state_code == "Estable"
    assert out.sub_scores["total"] == 23


def test_financial_fragil() -> None:
    out = score_pillar(PillarCode.P6B, _input(PillarCode.P6B, {
        "CFPB-B1": 0, "CFPB-B2": 1, "CFPB-B3": 1, "CFPB-B4": 5, "CFPB-B5": 0,  # 0+1+1+(6-5)+0=3
    }))
    assert out.state_code == "Frágil"
