"""Grading puro por tipo de pregunta (sin DB) — TASK A-04.

Cada ``grade_*`` toma la ORM ``QuizQuestion`` (con sus hijas ya cargadas) +
el payload de submit validado, y devuelve ``(is_correct, explanation,
correct_answer)`` listo para ``QuizSubmitResult``. Separado del router para
poder testear la lógica de corrección sin tocar la DB.
"""
from __future__ import annotations

from hg.modules.learning_units.models import QuizQuestion
from hg.modules.learning_units.schemas import (
    QuizSubmitFillBlank,
    QuizSubmitMatching,
    QuizSubmitMultipleChoice,
    QuizSubmitOrdering,
    QuizSubmitPayload,
    QuizSubmitSingleChoice,
    QuizSubmitTrueFalse,
)

GradeResult = tuple[bool, str | None, dict | None]


def grade_single_choice(question: QuizQuestion, payload: QuizSubmitSingleChoice) -> GradeResult:
    correct = {o.id for o in question.options if o.is_correct}
    selected = set(payload.selected_option_ids)
    is_correct = selected == correct
    picked = next((o for o in question.options if o.id in selected), None)
    explanation = picked.explanation if picked else None
    correct_option = next((o for o in question.options if o.is_correct), None)
    correct_answer = {"option_id": str(correct_option.id), "text": correct_option.text} if correct_option else None
    return is_correct, explanation, correct_answer


def grade_multiple_choice(question: QuizQuestion, payload: QuizSubmitMultipleChoice) -> GradeResult:
    correct = {o.id for o in question.options if o.is_correct}
    selected = set(payload.selected_option_ids)
    is_correct = selected == correct
    picked = [o for o in question.options if o.id in selected]
    explanation = " · ".join(o.explanation for o in picked) if picked else None
    correct_answer = {
        "option_ids": [str(o.id) for o in question.options if o.is_correct],
    }
    return is_correct, explanation, correct_answer


def grade_true_false(question: QuizQuestion, payload: QuizSubmitTrueFalse) -> GradeResult:
    tf = question.true_false
    if tf is None:
        return False, None, None
    is_correct = payload.boolean_answer == tf.correct_answer
    explanation = tf.explanation_true if payload.boolean_answer else tf.explanation_false
    correct_answer = {"correct_answer": tf.correct_answer}
    return is_correct, explanation, correct_answer


def grade_ordering(question: QuizQuestion, payload: QuizSubmitOrdering) -> GradeResult:
    items_by_id = {i.id: i for i in question.ordering_items}
    correct_order = [i.id for i in sorted(question.ordering_items, key=lambda i: i.correct_position)]
    is_correct = payload.ordering == correct_order
    explanations = [
        text for iid in correct_order
        if iid in items_by_id and (text := items_by_id[iid].explanation)
    ]
    explanation = " · ".join(explanations) if explanations else None
    correct_answer = {"ordering": [str(iid) for iid in correct_order]}
    return is_correct, explanation, correct_answer


def grade_matching(question: QuizQuestion, payload: QuizSubmitMatching) -> GradeResult:
    """Pairs no-distractor comparten el mismo id en left/right (ver
    ``build_matching_items`` en el router) — un match correcto es
    ``left_id == right_id``. Requiere match completo (sin parcial en Fase 1)."""
    real_pair_ids = {p.id for p in question.matching_pairs if not p.is_distractor}
    submitted = {(left, right) for left, right in payload.matching}
    correct_pairs = {(pid, pid) for pid in real_pair_ids}
    is_correct = submitted == correct_pairs
    correct_answer = {"pairs": [[str(pid), str(pid)] for pid in real_pair_ids]}
    return is_correct, None, correct_answer


def _normalize(text: str, case_sensitive: bool) -> str:
    return text.strip() if case_sensitive else text.strip().casefold()


def grade_fill_blank(question: QuizQuestion, payload: QuizSubmitFillBlank) -> GradeResult:
    answers = sorted(question.fill_blank_answers, key=lambda a: a.position)
    if len(payload.fill_blank_answers) != len(answers):
        is_correct = False
    else:
        is_correct = all(
            _normalize(submitted, ans.case_sensitive)
            in {_normalize(ans.correct_text, ans.case_sensitive)}
            | {_normalize(v, ans.case_sensitive) for v in ans.accept_variants}
            for submitted, ans in zip(payload.fill_blank_answers, answers, strict=False)
        )
    correct_answer = {"answers": [a.correct_text for a in answers]}
    return is_correct, None, correct_answer


def grade(question: QuizQuestion, payload: QuizSubmitPayload) -> GradeResult:
    if isinstance(payload, QuizSubmitSingleChoice):
        return grade_single_choice(question, payload)
    if isinstance(payload, QuizSubmitMultipleChoice):
        return grade_multiple_choice(question, payload)
    if isinstance(payload, QuizSubmitTrueFalse):
        return grade_true_false(question, payload)
    if isinstance(payload, QuizSubmitOrdering):
        return grade_ordering(question, payload)
    if isinstance(payload, QuizSubmitMatching):
        return grade_matching(question, payload)
    if isinstance(payload, QuizSubmitFillBlank):
        return grade_fill_blank(question, payload)
    raise AssertionError(f"unknown payload type {type(payload)!r}")
