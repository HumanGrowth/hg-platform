"""Seed del catálogo de assessment (B2-02)."""
from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from hg.modules.assessment.models import AssessmentInstrument, AssessmentItem
from hg.scripts.seed_assessment import seed


def test_seed_counts(db: Session) -> None:
    assert db.scalar(select(func.count()).select_from(AssessmentInstrument)) == 9
    assert db.scalar(select(func.count()).select_from(AssessmentItem)) == 57
    assert (
        db.scalar(
            select(func.count()).select_from(AssessmentItem).where(AssessmentItem.short_subset)
        )
        == 18
    )
    per_pillar = dict(
        db.execute(
            select(AssessmentItem.pillar_code, func.count()).group_by(AssessmentItem.pillar_code)
        ).all()
    )
    assert {p.value: c for p, c in per_pillar.items()} == {
        "P1": 5, "P2": 10, "P3": 8, "P4": 8, "P5": 11, "P6A": 10, "P6B": 5,
    }


def test_seed_is_idempotent(db: Session) -> None:
    before = db.scalar(select(func.count()).select_from(AssessmentItem))
    seed(db)  # re-run
    after = db.scalar(select(func.count()).select_from(AssessmentItem))
    assert before == after == 57


def test_reverse_scored_items_marked(db: Session) -> None:
    codes = set(
        db.scalars(
            select(AssessmentItem.item_code).where(AssessmentItem.reverse_scored)
        ).all()
    )
    assert codes == {"MLQ-5", "AAQ-B1", "CFPB-B4"}
