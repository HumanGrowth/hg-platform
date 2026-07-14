import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { QuizBlockView } from "../QuizBlockView";
import type { QuizBlock, QuizSubmitPayload, QuizSubmitResponse } from "@/lib/types";

const block: QuizBlock = {
  id: "quiz-1",
  position: 1,
  required: true,
  block_type: "quiz_recall",
  eyebrow: "COMPROBÁ TU COMPRENSIÓN",
  questions: [
    {
      id: "sc", position: 1, prompt: "Single choice?", question_type: "single_choice",
      options: [{ id: "sc-a", position: 1, text: "A" }, { id: "sc-b", position: 2, text: "B" }],
    },
    {
      id: "mc", position: 2, prompt: "Multiple choice?", question_type: "multiple_choice",
      options: [{ id: "mc-a", position: 1, text: "A" }, { id: "mc-b", position: 2, text: "B" }],
      scoring: "all_or_nothing",
    },
    { id: "tf", position: 3, prompt: "True or false?", question_type: "true_false" },
    {
      id: "ord", position: 4, prompt: "Order these", question_type: "ordering",
      items: [{ id: "o1", text: "First" }, { id: "o2", text: "Second" }],
    },
    {
      id: "match", position: 5, prompt: "Match these", question_type: "matching",
      left_items: [
        { id: "11111111-1111-1111-1111-111111111111", text: "L1" },
        { id: "22222222-2222-2222-2222-222222222222", text: "L2" },
      ],
      right_items: [
        { id: "11111111-1111-1111-1111-111111111111", text: "R1" },
        { id: "22222222-2222-2222-2222-222222222222", text: "R2" },
      ],
    },
    { id: "fb", position: 6, prompt: "Fill {{blank}} here", question_type: "fill_blank", blanks_count: 1 },
  ],
};

describe("QuizBlockView", () => {
  it("renders all 6 question types", () => {
    render(<QuizBlockView block={block} isCompleted={false} onSubmitQuiz={vi.fn()} />);
    expect(screen.getByText("Single choice?")).toBeTruthy();
    expect(screen.getByText("Multiple choice?")).toBeTruthy();
    expect(screen.getByText("True or false?")).toBeTruthy();
    expect(screen.getByText("Order these")).toBeTruthy();
    expect(screen.getByText("Match these")).toBeTruthy();
    // "here" aparece 2 veces a propósito: el <legend className="sr-only">
    // con el prompt completo (a11y) + el segmento visual partido por {{blank}}.
    expect(screen.getAllByText("here", { exact: false }).length).toBeGreaterThan(0);
  });

  it("shows 'ya completaste' state without re-answering when isCompleted and no fresh submit happened", () => {
    render(<QuizBlockView block={block} isCompleted onSubmitQuiz={vi.fn()} />);
    expect(screen.getByText("Ya completaste este quiz")).toBeTruthy();
    expect(screen.queryByText("Single choice?")).toBeNull();
  });

  it("submit button disabled until every question is answered, then submits + shows feedback", async () => {
    const onSubmitQuiz = vi.fn(
      async (_responses: QuizSubmitPayload[]): Promise<QuizSubmitResponse> => ({
        block_completed: true,
        results: [
          { question_id: "sc", is_correct: true, explanation: "Correcto sc", correct_answer: { option_id: "sc-a", text: "A" } },
          { question_id: "mc", is_correct: true, explanation: "Correcto mc", correct_answer: { option_ids: ["mc-a", "mc-b"] } },
          { question_id: "tf", is_correct: true, explanation: null, correct_answer: { correct_answer: true } },
          { question_id: "ord", is_correct: true, explanation: null, correct_answer: { ordering: ["o1", "o2"] } },
          {
            question_id: "match", is_correct: true, explanation: null,
            correct_answer: {
              pairs: [
                ["11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111"],
                ["22222222-2222-2222-2222-222222222222", "22222222-2222-2222-2222-222222222222"],
              ],
            },
          },
          { question_id: "fb", is_correct: true, explanation: null, correct_answer: { answers: ["respuesta"] } },
        ],
      }),
    );
    render(<QuizBlockView block={block} isCompleted={false} onSubmitQuiz={onSubmitQuiz} />);

    const submitBtn = screen.getByText("Enviar respuestas").closest("button") as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // "A"/"B" aparecen 2 veces cada uno (single_choice + multiple_choice) —
    // el índice 0 es siempre el de single_choice, el 1 el de multiple_choice.
    const allA = screen.getAllByText("A").map((el) => el.closest("button") as HTMLButtonElement);
    const allB = screen.getAllByText("B").map((el) => el.closest("button") as HTMLButtonElement);
    fireEvent.click(allA[0]); // single_choice
    fireEvent.click(allA[1]); // multiple_choice
    fireEvent.click(allB[1]); // multiple_choice
    // true_false
    fireEvent.click(screen.getByText("Verdadero"));
    // ordering: se deja el orden default (ya cuenta como "respondido")
    // matching: click-to-pair L1↔R1, L2↔R2
    fireEvent.click(screen.getByText("L1"));
    fireEvent.click(screen.getByText("R1"));
    fireEvent.click(screen.getByText("L2"));
    fireEvent.click(screen.getByText("R2"));
    // fill_blank
    fireEvent.change(screen.getByLabelText("Espacio 1"), { target: { value: "respuesta" } });

    expect(submitBtn.disabled).toBe(false);
    fireEvent.click(submitBtn);

    await screen.findByText("Correcto sc");
    expect(onSubmitQuiz).toHaveBeenCalledTimes(1);
    const payload = onSubmitQuiz.mock.calls[0][0];
    expect(payload).toEqual([
      { question_id: "sc", question_type: "single_choice", selected_option_ids: ["sc-a"] },
      { question_id: "mc", question_type: "multiple_choice", selected_option_ids: ["mc-a", "mc-b"] },
      { question_id: "tf", question_type: "true_false", boolean_answer: true },
      { question_id: "ord", question_type: "ordering", ordering: ["o1", "o2"] },
      {
        question_id: "match", question_type: "matching",
        matching: [
          ["11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111"],
          ["22222222-2222-2222-2222-222222222222", "22222222-2222-2222-2222-222222222222"],
        ],
      },
      { question_id: "fb", question_type: "fill_blank", fill_blank_answers: ["respuesta"] },
    ]);
    expect(screen.getByText("Correcto mc")).toBeTruthy();
  });

  it("filters non-UUID matching ids (distractors) out of the submit payload", async () => {
    const distractorBlock: QuizBlock = {
      id: "quiz-2", position: 1, required: true, block_type: "quiz_recall", eyebrow: "e",
      questions: [
        {
          id: "match", position: 1, prompt: "Match with a distractor", question_type: "matching",
          left_items: [
            { id: "11111111-1111-1111-1111-111111111111", text: "Real L" },
            { id: "distractor-id-L", text: "Distractor L" },
          ],
          right_items: [
            { id: "11111111-1111-1111-1111-111111111111", text: "Real R" },
            { id: "distractor-id-R", text: "Distractor R" },
          ],
        },
      ],
    };
    const onSubmitQuiz = vi.fn(async (_responses: QuizSubmitPayload[]): Promise<QuizSubmitResponse> => ({
      block_completed: true,
      results: [{ question_id: "match", is_correct: false, explanation: null, correct_answer: null }],
    }));
    render(<QuizBlockView block={distractorBlock} isCompleted={false} onSubmitQuiz={onSubmitQuiz} />);

    // Empareja el distractor (el usuario no puede distinguirlo visualmente).
    fireEvent.click(screen.getByText("Distractor L"));
    fireEvent.click(screen.getByText("Distractor R"));
    fireEvent.click(screen.getByText("Real L"));
    fireEvent.click(screen.getByText("Real R"));

    fireEvent.click(screen.getByText("Enviar respuestas"));
    await vi.waitFor(() => expect(onSubmitQuiz).toHaveBeenCalledTimes(1));

    const payload = onSubmitQuiz.mock.calls[0][0];
    expect(payload).toEqual([
      {
        question_id: "match", question_type: "matching",
        // Solo el par con UUIDs válidos llega al backend — el par con el
        // distractor se descarta silenciosamente (nunca puede ser "correcto").
        matching: [["11111111-1111-1111-1111-111111111111", "11111111-1111-1111-1111-111111111111"]],
      },
    ]);
  });
});
