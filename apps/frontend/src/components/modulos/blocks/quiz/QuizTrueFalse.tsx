import type { QuizQuestionTrueFalse, QuizSubmitResult } from "@/lib/types";
import { cn } from "@/lib/utils";

export function QuizTrueFalse({
  question,
  value,
  onChange,
  result,
  disabled,
}: {
  question: QuizQuestionTrueFalse;
  value: boolean | undefined;
  onChange: (value: boolean) => void;
  result?: QuizSubmitResult;
  disabled: boolean;
}) {
  const correctAnswer = result?.correct_answer?.correct_answer as boolean | undefined;

  function stateFor(option: boolean) {
    const selected = value === option;
    if (!result) return selected ? "selected" : "idle";
    if (option === correctAnswer) return "correct";
    if (selected) return "wrong";
    return "idle";
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-sans text-base font-semibold text-fg">{question.prompt}</legend>
      <div className="grid grid-cols-2 gap-3">
        {[true, false].map((option) => {
          const state = stateFor(option);
          return (
            <button
              key={String(option)}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option)}
              aria-pressed={value === option}
              className={cn(
                "rounded-md border px-4 py-6 text-center font-sans text-base font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber disabled:cursor-default",
                state === "correct" && "border-success bg-success-bg text-success",
                state === "wrong" && "border-danger bg-danger-bg text-danger",
                state === "selected" && "border-primary bg-hg-green-100 text-primary",
                state === "idle" && "border-border text-fg hover:bg-bg-sunken",
              )}
            >
              {option ? "Verdadero" : "Falso"}
            </button>
          );
        })}
      </div>
      {result?.explanation && <p className="text-sm text-fg-muted">{result.explanation}</p>}
    </fieldset>
  );
}
