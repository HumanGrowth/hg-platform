import { Check, X } from "lucide-react";

import type { QuizQuestionMultipleChoice, QuizSubmitResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuizMultipleChoice({
  question,
  value,
  onChange,
  result,
  disabled,
}: {
  question: QuizQuestionMultipleChoice;
  value: string[];
  onChange: (value: string[]) => void;
  result?: QuizSubmitResult;
  disabled: boolean;
}) {
  const correctIds = new Set((result?.correct_answer?.option_ids as string[] | undefined) ?? []);

  function toggle(id: string) {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-sans text-base font-semibold text-fg">{question.prompt}</legend>
      <p className="text-xs text-fg-muted">Elegí todas las que correspondan.</p>
      <div className="flex flex-col gap-2">
        {question.options.map((opt) => {
          const selected = value.includes(opt.id);
          const isCorrectOpt = result && correctIds.has(opt.id);
          const isWrongPick = result && selected && !isCorrectOpt;
          const missed = result && !selected && isCorrectOpt;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(opt.id)}
              aria-pressed={selected}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-left font-sans text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber disabled:cursor-default",
                result
                  ? isCorrectOpt
                    ? "border-success bg-success-bg text-success"
                    : isWrongPick
                      ? "border-danger bg-danger-bg text-danger"
                      : "border-border text-fg-muted"
                  : selected
                    ? "border-primary bg-hg-green-100 text-primary"
                    : "border-border text-fg hover:bg-bg-sunken",
              )}
            >
              <span>{opt.text}</span>
              {(isCorrectOpt || missed) && <Check size={16} strokeWidth={2} />}
              {isWrongPick && <X size={16} strokeWidth={2} />}
            </button>
          );
        })}
      </div>
      {result?.explanation && <p className="text-sm text-fg-muted">{result.explanation}</p>}
    </fieldset>
  );
}
