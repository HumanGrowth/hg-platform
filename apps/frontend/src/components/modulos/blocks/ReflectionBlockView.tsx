"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { ReflectionBlock } from "@/lib/types";

export function ReflectionBlockView({
  block,
  isCompleted,
  onSubmitReflection,
}: {
  block: ReflectionBlock;
  isCompleted: boolean;
  onSubmitReflection: (text: string) => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const canSubmit = text.trim().length >= block.min_chars && text.length <= block.max_chars;

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmitReflection(text);
    } finally {
      setSubmitting(false);
    }
  }

  if (isCompleted) {
    return (
      <div className="flex flex-col gap-3">
        <Eyebrow accent>{block.eyebrow}</Eyebrow>
        <p className="font-sans text-base text-fg">{block.prompt}</p>
        <div className="flex items-center gap-2 font-sans text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2} /> Ya enviaste tu reflexión
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Eyebrow accent>{block.eyebrow}</Eyebrow>
      <p className="font-sans text-base text-fg">{block.prompt}</p>
      {block.example && <p className="text-sm italic text-fg-muted">{block.example}</p>}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={block.max_chars}
        rows={5}
        placeholder="Escribí tu reflexión…"
        aria-label={block.prompt}
        className="w-full rounded-md border border-border bg-bg px-4 py-3 font-sans text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-fg-muted">
          {text.length}/{block.max_chars} · mínimo {block.min_chars}
        </span>
        <Button size="sm" onClick={() => void submit()} disabled={!canSubmit || submitting}>
          {submitting ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
