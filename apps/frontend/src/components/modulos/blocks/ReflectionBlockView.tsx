"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import type { ReflectionBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ReflectionBlockView({
  block,
  isCompleted,
  onSubmitReflection,
}: {
  block: ReflectionBlock;
  isCompleted: boolean;
  onSubmitReflection: (text: string) => Promise<void>;
}) {
  const shouldAnimate = useShouldAnimate();
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const trimmed = text.trim().length;
  const reachedMin = trimmed >= block.min_chars;
  const canSubmit = reachedMin && text.length <= block.max_chars;
  // Barra de progreso hacia el mínimo (TASK polish-03) — se llena mientras escribe.
  const progress = Math.min(100, block.min_chars > 0 ? (trimmed / block.min_chars) * 100 : 100);

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
        <motion.div
          initial={shouldAnimate ? { scale: 0, opacity: 0 } : false}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="flex items-center gap-2 self-start font-sans text-sm font-semibold text-success"
        >
          <Check size={18} strokeWidth={2} /> Guardado
        </motion.div>
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
        className="w-full rounded-md border border-border bg-bg px-4 py-3 font-sans text-sm text-fg transition-shadow placeholder:text-fg-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            reachedMin ? "bg-success" : "bg-hg-amber",
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
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
