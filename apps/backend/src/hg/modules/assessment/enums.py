"""Enums del motor de assessment (B2-02)."""
from __future__ import annotations

from enum import Enum


class PillarCode(str, Enum):
    P1 = "P1"  # Carrera
    P2 = "P2"  # Propósito
    P3 = "P3"  # Relaciones
    P4 = "P4"  # Salud
    P5 = "P5"  # Paz Interior
    P6A = "P6A"  # Resiliencia
    P6B = "P6B"  # Finanzas


class InstrumentCode(str, Enum):
    PMM_V3 = "PMM_V3"
    MLQ_10 = "MLQ_10"
    UCLA_3 = "UCLA_3"
    CACIOPPO_5 = "CACIOPPO_5"
    PROCHASKA = "PROCHASKA"
    ERQ_10 = "ERQ_10"
    AAQ_II = "AAQ_II"
    CD_RISC_10 = "CD_RISC_10"
    CFPB_5 = "CFPB_5"


class ResponseType(str, Enum):
    likert_1_5 = "likert_1_5"
    likert_1_7 = "likert_1_7"
    likert_0_4 = "likert_0_4"  # CD-RISC
    multiple_choice = "multiple_choice"  # Prochaska, PMM, CFPB B1/B5


class SessionKind(str, Enum):
    onboarding_short = "onboarding_short"
    pillar_detail = "pillar_detail"


class SessionStatus(str, Enum):
    in_progress = "in_progress"
    completed = "completed"
    expired = "expired"
    abandoned = "abandoned"


class ResultSource(str, Enum):
    preliminary = "preliminary"  # del onboarding_short
    confirmed = "confirmed"  # del pillar_detail
