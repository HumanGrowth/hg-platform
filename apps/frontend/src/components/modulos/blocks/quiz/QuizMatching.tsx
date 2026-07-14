import * as React from "react";

import type { QuizQuestionMatching, QuizSubmitResult } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Click-to-select-pair fallback (drag-and-drop no está en scope sin
 * @dnd-kit instalado — el propio spec de B-06 acepta este fallback).
 * `value` puede incluir pares que involucran distractors (la UI no puede
 * distinguirlos visualmente); QuizBlockView filtra a UUIDs válidos antes
 * de armar el submit payload. */
export function QuizMatching({
  question,
  value,
  onChange,
  result,
  disabled,
}: {
  question: QuizQuestionMatching;
  value: [string, string][];
  onChange: (value: [string, string][]) => void;
  result?: QuizSubmitResult;
  disabled: boolean;
}) {
  const [pendingLeft, setPendingLeft] = React.useState<string | null>(null);

  const pairedLeft = new Map(value);
  const pairedRight = new Map(value.map(([l, r]) => [r, l]));

  function clickLeft(id: string) {
    if (disabled) return;
    if (pairedLeft.has(id)) {
      onChange(value.filter(([l]) => l !== id));
      setPendingLeft(null);
      return;
    }
    setPendingLeft(pendingLeft === id ? null : id);
  }

  function clickRight(id: string) {
    if (disabled) return;
    if (pairedRight.has(id)) {
      onChange(value.filter(([, r]) => r !== id));
      return;
    }
    if (!pendingLeft) return;
    onChange([...value, [pendingLeft, id]]);
    setPendingLeft(null);
  }

  const correctPairs = (result?.correct_answer?.pairs as [string, string][] | undefined) ?? [];
  const textById = new Map(
    [...question.left_items, ...question.right_items].map((i) => [i.id, i.text]),
  );

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="font-sans text-base font-semibold text-fg">{question.prompt}</legend>
      <p className="text-xs text-fg-muted">Tocá un ítem de la izquierda y después su par a la derecha.</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {question.left_items.map((item) => {
            const paired = pairedLeft.has(item.id);
            const pending = pendingLeft === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => clickLeft(item.id)}
                aria-pressed={paired || pending}
                aria-label={paired ? `${item.text} (emparejado)` : pending ? `${item.text} (seleccionado, elegí su par a la derecha)` : item.text}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left font-sans text-sm transition-colors disabled:cursor-default",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
                  paired
                    ? "border-primary bg-hg-green-100 text-primary"
                    : pending
                      ? "border-hg-amber bg-warning-bg text-fg"
                      : "border-border text-fg hover:bg-bg-sunken",
                )}
              >
                {item.text}
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-2">
          {question.right_items.map((item) => {
            const paired = pairedRight.has(item.id);
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => clickRight(item.id)}
                aria-pressed={paired}
                aria-label={paired ? `${item.text} (emparejado)` : item.text}
                className={cn(
                  "rounded-md border px-3 py-2.5 text-left font-sans text-sm transition-colors disabled:cursor-default",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
                  paired
                    ? "border-primary bg-hg-green-100 text-primary"
                    : "border-border text-fg hover:bg-bg-sunken",
                )}
              >
                {item.text}
              </button>
            );
          })}
        </div>
      </div>
      {result && !result.is_correct && correctPairs.length > 0 && (
        <p className="text-sm text-fg-muted">
          Pares correctos:{" "}
          {correctPairs.map(([l, r]) => `${textById.get(l)} → ${textById.get(r)}`).join(" · ")}
        </p>
      )}
    </fieldset>
  );
}
