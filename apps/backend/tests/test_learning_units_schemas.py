"""Serialization tests for Learning Units discriminated unions (TASK A-03).

No requiere DB — son puramente schemas de Pydantic. Un test por tipo de
bloque + un test por tipo de pregunta de quiz (6) + submit payloads (6).
"""
from __future__ import annotations

from uuid import uuid4

import pytest
from pydantic import TypeAdapter, ValidationError

from hg.modules.learning_units.schemas import (
    LearningUnitDetail,
    QuizSubmitPayload,
    ReflectionBlockRead,
    TextBlockRead,
    VideoBlockRead,
)


def _unit_payload(blocks: list[dict]) -> dict:
    return {
        "id": str(uuid4()), "slug": "s", "title": "t", "pillar_code": "P1",
        "competency_code": None, "level_code": "L2", "mentor_id": None,
        "published_at": None, "estimated_duration_seconds": 90, "blocks": blocks,
    }


def _video_block(block_type: str = "video_intro") -> dict:
    return {
        "id": str(uuid4()), "position": 1, "required": True, "block_type": block_type,
        "youtube_video_id": "dQw4w9WgXcQ", "poster_url": None, "duration_seconds": 10,
        "subtitle_url": None, "transcript_text": None, "eyebrow_label": None,
    }


def _text_block(variant: str) -> dict:
    return {
        "id": str(uuid4()), "position": 1, "required": True, "block_type": f"text_{variant}",
        "variant": variant, "eyebrow": "E", "body": "b" * 40, "citation": None,
        "applies_to": None, "requires_evidence_block_id": None,
    }


class TestBlockTypes:
    def test_video_block_discriminates_correctly(self) -> None:
        unit = LearningUnitDetail.model_validate(_unit_payload([_video_block()]))
        assert isinstance(unit.blocks[0], VideoBlockRead)
        assert unit.blocks[0].youtube_video_id == "dQw4w9WgXcQ"

    def test_text_block_discriminates_correctly(self) -> None:
        unit = LearningUnitDetail.model_validate(_unit_payload([_text_block("context")]))
        assert isinstance(unit.blocks[0], TextBlockRead)
        assert unit.blocks[0].variant == "context"

    def test_text_evidence_with_citation(self) -> None:
        block = _text_block("evidence")
        block["citation"] = {
            "text": "Edmondson, ASQ 1999", "source": "Amy Edmondson", "year": 1999,
            "doi_or_url": "https://doi.org/10.2307/2666999", "tier": "observational",
        }
        unit = LearningUnitDetail.model_validate(_unit_payload([block]))
        assert unit.blocks[0].citation.tier == "observational"  # type: ignore[union-attr]

    def test_reflection_block_discriminates_correctly(self) -> None:
        block = {
            "id": str(uuid4()), "position": 1, "required": True, "block_type": "reflection_write",
            "eyebrow": "E", "prompt": "p", "min_chars": 30, "max_chars": 500, "example": None,
        }
        unit = LearningUnitDetail.model_validate(_unit_payload([block]))
        assert isinstance(unit.blocks[0], ReflectionBlockRead)

    def test_unknown_block_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            LearningUnitDetail.model_validate(_unit_payload([{**_video_block(), "block_type": "bogus"}]))


def _quiz_block(question: dict) -> dict:
    return {
        "id": str(uuid4()), "position": 1, "required": True, "block_type": "quiz_recall",
        "eyebrow": "COMPROBÁ TU COMPRENSIÓN", "questions": [question],
    }


class TestQuizQuestionTypes:
    def test_single_choice(self) -> None:
        q = {"id": str(uuid4()), "position": 1, "prompt": "p", "question_type": "single_choice",
             "options": [{"id": str(uuid4()), "position": 1, "text": "a"}]}
        unit = LearningUnitDetail.model_validate(_unit_payload([_quiz_block(q)]))
        assert unit.blocks[0].questions[0].question_type == "single_choice"  # type: ignore[union-attr]

    def test_multiple_choice(self) -> None:
        q = {"id": str(uuid4()), "position": 1, "prompt": "p", "question_type": "multiple_choice",
             "options": [{"id": str(uuid4()), "position": 1, "text": "a"}], "scoring": "partial"}
        unit = LearningUnitDetail.model_validate(_unit_payload([_quiz_block(q)]))
        assert unit.blocks[0].questions[0].scoring == "partial"  # type: ignore[union-attr]

    def test_true_false_hides_correct_answer(self) -> None:
        q = {"id": str(uuid4()), "position": 1, "prompt": "p", "question_type": "true_false"}
        unit = LearningUnitDetail.model_validate(_unit_payload([_quiz_block(q)]))
        dumped = unit.blocks[0].questions[0].model_dump()  # type: ignore[union-attr]
        assert "correct_answer" not in dumped

    def test_ordering(self) -> None:
        q = {"id": str(uuid4()), "position": 1, "prompt": "p", "question_type": "ordering",
             "items": [{"id": str(uuid4()), "text": "step 1"}, {"id": str(uuid4()), "text": "step 2"}]}
        unit = LearningUnitDetail.model_validate(_unit_payload([_quiz_block(q)]))
        assert len(unit.blocks[0].questions[0].items) == 2  # type: ignore[union-attr]

    def test_matching(self) -> None:
        q = {"id": str(uuid4()), "position": 1, "prompt": "p", "question_type": "matching",
             "left_items": [{"id": "l1", "text": "a"}], "right_items": [{"id": "r1", "text": "b"}]}
        unit = LearningUnitDetail.model_validate(_unit_payload([_quiz_block(q)]))
        assert unit.blocks[0].questions[0].left_items[0].id == "l1"  # type: ignore[union-attr]

    def test_fill_blank(self) -> None:
        q = {"id": str(uuid4()), "position": 1, "prompt": "p {{blank}}", "question_type": "fill_blank",
             "blanks_count": 1}
        unit = LearningUnitDetail.model_validate(_unit_payload([_quiz_block(q)]))
        assert unit.blocks[0].questions[0].blanks_count == 1  # type: ignore[union-attr]


class TestQuizSubmitPayload:
    """El discriminador de submit usa question_type — cada tipo espera campos
    distintos (no un blob con todos los campos opcionales)."""

    adapter: TypeAdapter = TypeAdapter(QuizSubmitPayload)

    @pytest.mark.parametrize(
        "payload",
        [
            {"question_type": "single_choice", "selected_option_ids": [str(uuid4())]},
            {"question_type": "multiple_choice", "selected_option_ids": [str(uuid4()), str(uuid4())]},
            {"question_type": "true_false", "boolean_answer": False},
            {"question_type": "ordering", "ordering": [str(uuid4()), str(uuid4())]},
            {"question_type": "matching", "matching": [[str(uuid4()), str(uuid4())]]},
            {"question_type": "fill_blank", "fill_blank_answers": ["Edmondson"]},
        ],
    )
    def test_each_type_validates(self, payload: dict) -> None:
        full = {"question_id": str(uuid4()), **payload}
        result = self.adapter.validate_python(full)
        assert result.question_type == payload["question_type"]

    def test_single_choice_requires_at_least_one_option(self) -> None:
        with pytest.raises(ValidationError):
            self.adapter.validate_python(
                {"question_id": str(uuid4()), "question_type": "single_choice", "selected_option_ids": []}
            )

    def test_mismatched_type_rejected(self) -> None:
        with pytest.raises(ValidationError):
            self.adapter.validate_python(
                {"question_id": str(uuid4()), "question_type": "true_false", "selected_option_ids": []}
            )
