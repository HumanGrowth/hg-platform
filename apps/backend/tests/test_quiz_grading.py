"""Unit tests for per-type quiz grading (TASK A-04) — no DB, objetos ORM en memoria."""
from __future__ import annotations

from uuid import uuid4

from hg.modules.learning_units import quiz_grading as g
from hg.modules.learning_units.models import (
    QuizFillBlankAnswer,
    QuizMatchingPair,
    QuizMultipleChoiceConfig,
    QuizOption,
    QuizOrderingItem,
    QuizQuestion,
    QuizTrueFalse,
)
from hg.modules.learning_units.schemas import (
    QuizSubmitFillBlank,
    QuizSubmitMatching,
    QuizSubmitMultipleChoice,
    QuizSubmitOrdering,
    QuizSubmitSingleChoice,
    QuizSubmitTrueFalse,
)


def test_single_choice_correct_and_incorrect() -> None:
    q = QuizQuestion(id=uuid4(), question_type="single_choice", prompt="p", position=1)
    right, wrong = QuizOption(id=uuid4(), text="right", is_correct=True, explanation="yes"), \
        QuizOption(id=uuid4(), text="wrong", is_correct=False, explanation="no")
    q.options = [right, wrong]

    ok, expl, correct = g.grade_single_choice(
        q, QuizSubmitSingleChoice(question_id=q.id, question_type="single_choice", selected_option_ids=[right.id])
    )
    assert ok is True and expl == "yes" and correct == {"option_id": str(right.id), "text": "right"}

    ok2, expl2, _ = g.grade_single_choice(
        q, QuizSubmitSingleChoice(question_id=q.id, question_type="single_choice", selected_option_ids=[wrong.id])
    )
    assert ok2 is False and expl2 == "no"


def test_multiple_choice_requires_exact_set() -> None:
    q = QuizQuestion(id=uuid4(), question_type="multiple_choice", prompt="p", position=1)
    a = QuizOption(id=uuid4(), text="a", is_correct=True, explanation="a is right")
    b = QuizOption(id=uuid4(), text="b", is_correct=True, explanation="b is right")
    c = QuizOption(id=uuid4(), text="c", is_correct=False, explanation="c is wrong")
    q.options = [a, b, c]
    q.multiple_choice_config = QuizMultipleChoiceConfig(question_id=q.id, scoring="partial")

    ok, _, correct = g.grade_multiple_choice(
        q, QuizSubmitMultipleChoice(question_id=q.id, question_type="multiple_choice",
                                     selected_option_ids=[a.id, b.id])
    )
    assert ok is True
    assert set(correct["option_ids"]) == {str(a.id), str(b.id)}

    partial, _, _ = g.grade_multiple_choice(
        q, QuizSubmitMultipleChoice(question_id=q.id, question_type="multiple_choice", selected_option_ids=[a.id])
    )
    assert partial is False  # sin partial credit en Fase 1 — set exacto o nada


def test_true_false_explanations_differ_by_answer() -> None:
    q = QuizQuestion(id=uuid4(), question_type="true_false", prompt="p", position=1)
    q.true_false = QuizTrueFalse(
        question_id=q.id, correct_answer=False, explanation_true="wrong, here's why",
        explanation_false="correct, here's why",
    )
    ok, expl, correct = g.grade_true_false(
        q, QuizSubmitTrueFalse(question_id=q.id, question_type="true_false", boolean_answer=False)
    )
    assert ok is True and expl == "correct, here's why" and correct == {"correct_answer": False}

    ok2, expl2, _ = g.grade_true_false(
        q, QuizSubmitTrueFalse(question_id=q.id, question_type="true_false", boolean_answer=True)
    )
    assert ok2 is False and expl2 == "wrong, here's why"


def test_ordering_requires_exact_sequence() -> None:
    q = QuizQuestion(id=uuid4(), question_type="ordering", prompt="p", position=1)
    i1 = QuizOrderingItem(id=uuid4(), text="first", correct_position=1, explanation="step one")
    i2 = QuizOrderingItem(id=uuid4(), text="second", correct_position=2, explanation="step two")
    q.ordering_items = [i2, i1]  # orden de carga desordenado a propósito

    ok, expl, correct = g.grade_ordering(
        q, QuizSubmitOrdering(question_id=q.id, question_type="ordering", ordering=[i1.id, i2.id])
    )
    assert ok is True
    assert correct["ordering"] == [str(i1.id), str(i2.id)]
    assert expl == "step one · step two"

    ok2, _, _ = g.grade_ordering(
        q, QuizSubmitOrdering(question_id=q.id, question_type="ordering", ordering=[i2.id, i1.id])
    )
    assert ok2 is False


def test_matching_full_match_required_ignores_distractors() -> None:
    q = QuizQuestion(id=uuid4(), question_type="matching", prompt="p", position=1)
    p1 = QuizMatchingPair(id=uuid4(), left_text="l1", right_text="r1", is_distractor=False)
    p2 = QuizMatchingPair(id=uuid4(), left_text="l2", right_text="r2", is_distractor=False)
    distractor = QuizMatchingPair(id=uuid4(), left_text="l3", right_text="r3", is_distractor=True)
    q.matching_pairs = [p1, p2, distractor]

    ok, _, correct = g.grade_matching(
        q, QuizSubmitMatching(question_id=q.id, question_type="matching", matching=[(p1.id, p1.id), (p2.id, p2.id)])
    )
    assert ok is True
    assert len(correct["pairs"]) == 2  # el distractor no cuenta

    # Emparejar con el distractor nunca es correcto (id distinto en left/right en el router,
    # pero incluso pasando el mismo id acá el set no coincide con los pares reales completos).
    ok2, _, _ = g.grade_matching(
        q, QuizSubmitMatching(
            question_id=q.id, question_type="matching",
            matching=[(p1.id, p1.id), (p2.id, p2.id), (distractor.id, distractor.id)],
        )
    )
    assert ok2 is False


def test_fill_blank_accepts_variants_case_insensitive_by_default() -> None:
    q = QuizQuestion(id=uuid4(), question_type="fill_blank", prompt="p {{blank}}", position=1)
    ans = QuizFillBlankAnswer(
        id=uuid4(), position=1, correct_text="Edmondson", accept_variants=["edmondsen"], case_sensitive=False
    )
    q.fill_blank_answers = [ans]

    ok, _, correct = g.grade_fill_blank(
        q, QuizSubmitFillBlank(question_id=q.id, question_type="fill_blank", fill_blank_answers=["EDMONDSON"])
    )
    assert ok is True
    assert correct == {"answers": ["Edmondson"]}

    ok_variant, _, _ = g.grade_fill_blank(
        q, QuizSubmitFillBlank(question_id=q.id, question_type="fill_blank", fill_blank_answers=["edmondsen"])
    )
    assert ok_variant is True

    ok_wrong, _, _ = g.grade_fill_blank(
        q, QuizSubmitFillBlank(question_id=q.id, question_type="fill_blank", fill_blank_answers=["someone else"])
    )
    assert ok_wrong is False


def test_fill_blank_case_sensitive() -> None:
    q = QuizQuestion(id=uuid4(), question_type="fill_blank", prompt="p", position=1)
    ans = QuizFillBlankAnswer(
        id=uuid4(), position=1, correct_text="CamelCase", accept_variants=[], case_sensitive=True
    )
    q.fill_blank_answers = [ans]

    ok, _, _ = g.grade_fill_blank(
        q, QuizSubmitFillBlank(question_id=q.id, question_type="fill_blank", fill_blank_answers=["camelcase"])
    )
    assert ok is False
