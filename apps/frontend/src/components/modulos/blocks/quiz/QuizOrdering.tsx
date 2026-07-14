import { ArrowDown, ArrowUp } from "lucide-react";

import type { QuizQuestionOrdering, QuizSubmitResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/** @dnd-kit no está instalado en el proyecto (confirmado — no se agrega
 * sin consultar, per hard rule) — fallback de botones up/down, tal como
 * el propio spec de B-06 lo permite explícitamente. */
export function QuizOrdering({
  question,
  value,
  onChange,
  result,
  disabled,
}: {
  question: QuizQuestionOrdering;
  value: string[];
  onChange: (value: string[]) => void;
  result?: QuizSubmitResult;
  disabled: boolean;
}) {
  const textById = new Map(question.items.map((i) => [i.id, i.text]));

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-sans text-base font-semibold text-fg">{question.prompt}</legend>
      <p className="text-xs text-fg-muted">Ordená los pasos con las flechas.</p>
      <ol className="flex flex-col gap-2">
        {value.map((id, index) => (
          <li
            key={id}
            className={cn(
              "flex items-center gap-3 rounded-md border border-border px-4 py-3 font-sans text-sm text-fg",
              result && (result.is_correct ? "border-success bg-success-bg" : "border-danger bg-danger-bg"),
            )}
          >
            <span className="font-mono text-xs text-fg-muted">{index + 1}</span>
            <span className="flex-1">{textById.get(id)}</span>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
                aria-label="Subir"
                className="rounded p-1 text-fg-muted hover:bg-bg-sunken disabled:opacity-30"
              >
                <ArrowUp size={16} strokeWidth={1.75} />
              </button>
              <button
                type="button"
                disabled={disabled || index === value.length - 1}
                onClick={() => move(index, 1)}
                aria-label="Bajar"
                className="rounded p-1 text-fg-muted hover:bg-bg-sunken disabled:opacity-30"
              >
                <ArrowDown size={16} strokeWidth={1.75} />
              </button>
            </div>
          </li>
        ))}
      </ol>
      {result && !result.is_correct && (
        <p className="text-sm text-fg-muted">
          Orden correcto:{" "}
          {((result.correct_answer?.ordering as string[] | undefined) ?? [])
            .map((id) => textById.get(id))
            .join(" → ")}
        </p>
      )}
      {result?.explanation && <p className="text-sm text-fg-muted">{result.explanation}</p>}
    </fieldset>
  );
}
