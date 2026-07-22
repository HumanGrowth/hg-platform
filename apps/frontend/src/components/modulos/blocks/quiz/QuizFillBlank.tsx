import * as React from "react";

import type { QuizQuestionFillBlank, QuizSubmitResult } from "@/lib/types";
import { cn } from "@/lib/utils";

const BLANK_TOKEN = "{{blank}}";

export function QuizFillBlank({
  question,
  value,
  onChange,
  result,
  disabled,
}: {
  question: QuizQuestionFillBlank;
  value: string[];
  onChange: (value: string[]) => void;
  result?: QuizSubmitResult;
  disabled: boolean;
}) {
  const segments = question.prompt.split(BLANK_TOKEN);
  const correctAnswers = (result?.correct_answer?.answers as string[] | undefined) ?? [];

  function setBlank(index: number, text: string) {
    const next = [...value];
    next[index] = text;
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{question.prompt}</legend>
      <p className="flex flex-wrap items-center gap-2 font-sans text-base text-fg">
        {segments.map((segment, i) => (
          <React.Fragment key={i}>
            {segment}
            {i < segments.length - 1 && (
              <input
                type="text"
                value={value[i] ?? ""}
                onChange={(e) => setBlank(i, e.target.value)}
                disabled={disabled}
                aria-label={`Espacio ${i + 1}`}
                className={cn(
                  "w-32 rounded-md border px-2 py-1 font-sans text-sm text-fg",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber disabled:opacity-70",
                  result
                    ? result.is_correct
                      ? "border-success bg-success-bg"
                      : // TASK polish-06: incorrecta en neutro, no rojo.
                        "border-border-strong bg-bg-sunken"
                    : "border-border-strong bg-bg",
                )}
              />
            )}
          </React.Fragment>
        ))}
      </p>
      {result && !result.is_correct && correctAnswers.length > 0 && (
        <p className="text-sm text-fg-muted">Respuesta correcta: {correctAnswers.join(", ")}</p>
      )}
    </fieldset>
  );
}
