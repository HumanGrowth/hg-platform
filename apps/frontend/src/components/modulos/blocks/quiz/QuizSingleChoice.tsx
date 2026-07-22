import { Check, X } from "lucide-react";

import type { QuizQuestionSingleChoice, QuizSubmitResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuizSingleChoice({
  question,
  value,
  onChange,
  result,
  disabled,
}: {
  question: QuizQuestionSingleChoice;
  value: string | undefined;
  onChange: (value: string) => void;
  result?: QuizSubmitResult;
  disabled: boolean;
}) {
  const correctId = result?.correct_answer?.option_id as string | undefined;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-sans text-base font-semibold text-fg">{question.prompt}</legend>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const selected = value === opt.id;
          const isCorrectOpt = result && opt.id === correctId;
          const isWrongPick = result && selected && !result.is_correct;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left font-sans text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber disabled:cursor-default",
                result
                  ? isCorrectOpt
                    ? "border-success bg-success-bg text-success"
                    : isWrongPick
                      ? // TASK polish-06: la elección incorrecta se muestra neutra
                        // (no roja/punitiva) — sólo se resalta la correcta en verde.
                        "border-border-strong bg-bg-sunken text-fg-muted"
                      : "border-border text-fg-muted"
                  : selected
                    ? "border-primary bg-hg-green-100 text-primary"
                    : "border-border text-fg hover:bg-bg-sunken",
              )}
            >
              <span>{opt.text}</span>
              {result && isCorrectOpt && <Check size={16} strokeWidth={2} />}
              {result && isWrongPick && <X size={16} strokeWidth={2} />}
            </button>
          );
        })}
      </div>
      {result?.explanation && <p className="text-sm text-fg-muted">{result.explanation}</p>}
    </fieldset>
  );
}
