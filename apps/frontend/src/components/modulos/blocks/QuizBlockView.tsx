"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type {
  QuizBlock,
  QuizQuestion,
  QuizSubmitPayload,
  QuizSubmitResponse,
  QuizSubmitResult,
} from "@/lib/types";
import { isValidUuid } from "@/lib/utils";

import { QuizFillBlank } from "./quiz/QuizFillBlank";
import { QuizMatching } from "./quiz/QuizMatching";
import { QuizMultipleChoice } from "./quiz/QuizMultipleChoice";
import { QuizOrdering } from "./quiz/QuizOrdering";
import { QuizSingleChoice } from "./quiz/QuizSingleChoice";
import { QuizTrueFalse } from "./quiz/QuizTrueFalse";

type AnswerValue = string | string[] | boolean | [string, string][] | undefined;

function initialAnswer(question: QuizQuestion): AnswerValue {
  switch (question.question_type) {
    case "single_choice":
    case "true_false":
      return undefined; // sin selección todavía
    case "multiple_choice":
    case "matching":
      return [];
    case "ordering":
      return question.items.map((i) => i.id); // ya "respondido" con el orden shuffled
    case "fill_blank":
      return Array.from({ length: question.blanks_count }, () => "");
  }
}

function isAnswered(question: QuizQuestion, value: AnswerValue): boolean {
  switch (question.question_type) {
    case "single_choice":
      return typeof value === "string" && value.length > 0;
    case "multiple_choice":
      return Array.isArray(value) && value.length > 0;
    case "true_false":
      return typeof value === "boolean";
    case "ordering":
      return Array.isArray(value) && value.length === question.items.length;
    case "matching":
      return Array.isArray(value) && value.length > 0;
    case "fill_blank":
      return (
        Array.isArray(value) &&
        value.length === question.blanks_count &&
        (value as string[]).every((v) => v.trim().length > 0)
      );
  }
}

function buildPayload(question: QuizQuestion, value: AnswerValue): QuizSubmitPayload {
  switch (question.question_type) {
    case "single_choice":
      return {
        question_id: question.id,
        question_type: "single_choice",
        selected_option_ids: [value as string],
      };
    case "multiple_choice":
      return {
        question_id: question.id,
        question_type: "multiple_choice",
        selected_option_ids: value as string[],
      };
    case "true_false":
      return { question_id: question.id, question_type: "true_false", boolean_answer: value as boolean };
    case "ordering":
      return { question_id: question.id, question_type: "ordering", ordering: value as string[] };
    case "matching":
      return {
        question_id: question.id,
        question_type: "matching",
        // Distractors (id con sufijo -L/-R) nunca son UUIDs válidos — se
        // filtran acá antes de enviar (ver MatchingItemOut en lib/types.ts).
        matching: (value as [string, string][]).filter(([l, r]) => isValidUuid(l) && isValidUuid(r)),
      };
    case "fill_blank":
      return {
        question_id: question.id,
        question_type: "fill_blank",
        fill_blank_answers: value as string[],
      };
  }
}

export function QuizBlockView({
  block,
  isCompleted,
  onSubmitQuiz,
}: {
  block: QuizBlock;
  isCompleted: boolean;
  onSubmitQuiz: (responses: QuizSubmitPayload[]) => Promise<QuizSubmitResponse>;
}) {
  const [answers, setAnswers] = React.useState<Record<string, AnswerValue>>(() =>
    Object.fromEntries(block.questions.map((q) => [q.id, initialAnswer(q)])),
  );
  const [results, setResults] = React.useState<Record<string, QuizSubmitResult> | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState(false);

  const allAnswered = block.questions.every((q) => isAnswered(q, answers[q.id]));
  const alreadySubmitted = isCompleted && !results;

  async function submit() {
    if (!allAnswered || submitting) return;
    setSubmitting(true);
    setError(false);
    try {
      const payloads = block.questions.map((q) => buildPayload(q, answers[q.id]));
      const res = await onSubmitQuiz(payloads);
      setResults(Object.fromEntries(res.results.map((r) => [r.question_id, r])));
    } catch {
      setError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (alreadySubmitted) {
    return (
      <div className="flex flex-col gap-3">
        <Eyebrow accent>{block.eyebrow}</Eyebrow>
        <div className="flex items-center gap-2 font-sans text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2} /> Ya completaste este quiz
        </div>
      </div>
    );
  }

  const disabled = results !== null;

  return (
    <div className="flex flex-col gap-6">
      <Eyebrow accent>{block.eyebrow}</Eyebrow>
      {block.questions.map((q) => {
        const result = results?.[q.id];
        const value = answers[q.id];
        const setValue = (v: AnswerValue) => setAnswers((prev) => ({ ...prev, [q.id]: v }));

        switch (q.question_type) {
          case "single_choice":
            return (
              <QuizSingleChoice
                key={q.id}
                question={q}
                value={value as string}
                onChange={setValue}
                result={result}
                disabled={disabled}
              />
            );
          case "multiple_choice":
            return (
              <QuizMultipleChoice
                key={q.id}
                question={q}
                value={value as string[]}
                onChange={setValue}
                result={result}
                disabled={disabled}
              />
            );
          case "true_false":
            return (
              <QuizTrueFalse
                key={q.id}
                question={q}
                value={value as boolean}
                onChange={setValue}
                result={result}
                disabled={disabled}
              />
            );
          case "ordering":
            return (
              <QuizOrdering
                key={q.id}
                question={q}
                value={value as string[]}
                onChange={setValue}
                result={result}
                disabled={disabled}
              />
            );
          case "matching":
            return (
              <QuizMatching
                key={q.id}
                question={q}
                value={value as [string, string][]}
                onChange={setValue}
                result={result}
                disabled={disabled}
              />
            );
          case "fill_blank":
            return (
              <QuizFillBlank
                key={q.id}
                question={q}
                value={value as string[]}
                onChange={setValue}
                result={result}
                disabled={disabled}
              />
            );
        }
      })}

      {!results && (
        <Button onClick={() => void submit()} disabled={!allAnswered || submitting} className="self-start">
          {submitting ? "Enviando…" : "Enviar respuestas"}
        </Button>
      )}
      {error && <p className="text-sm text-danger">No pudimos enviar tus respuestas. Probá de nuevo.</p>}
    </div>
  );
}
