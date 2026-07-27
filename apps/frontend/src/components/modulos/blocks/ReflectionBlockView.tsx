"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import * as React from "react";

import { CircularCounter } from "@/components/modulos/blocks/CircularCounter";
import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { dimensionStyle } from "@/lib/pillars";
import type { ReflectionBlock } from "@/lib/types";

/** Textura de cuaderno: renglones tenues sobre un papel cálido (Sprint UI T8). */
const NOTEBOOK_TEXTURE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to bottom, transparent, transparent 27px, color-mix(in srgb, var(--fg) 8%, transparent) 27px, color-mix(in srgb, var(--fg) 8%, transparent) 28px)",
  backgroundColor: "color-mix(in srgb, var(--hg-amber) 4%, var(--bg))",
};

export function ReflectionBlockView({
  block,
  isCompleted,
  onSubmitReflection,
  dimensionCode,
}: {
  block: ReflectionBlock;
  isCompleted: boolean;
  onSubmitReflection: (text: string) => Promise<void>;
  dimensionCode?: string;
}) {
  const shouldAnimate = useShouldAnimate();
  const glow = dimensionStyle(dimensionCode).glow;
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const trimmed = text.trim().length;
  const reachedMin = trimmed >= block.min_chars;
  const canSubmit = reachedMin && text.length <= block.max_chars;

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
        <p className="font-heading text-base text-fg">{block.prompt}</p>
        {/* sello/stamp: rota y "cae" con un rebote + brillo del pilar */}
        <motion.div
          initial={shouldAnimate ? { scale: 1.6, opacity: 0, rotate: -18 } : false}
          animate={{ scale: 1, opacity: 1, rotate: -6 }}
          transition={{ type: "spring", stiffness: 600, damping: 18 }}
          style={{ boxShadow: `0 0 16px 0 color-mix(in srgb, ${glow} 40%, transparent)` }}
          className="flex items-center gap-2 self-start rounded-md border-2 border-success px-3 py-1.5 font-heading text-sm font-bold uppercase tracking-wide text-success"
        >
          <Check size={16} strokeWidth={3} /> Guardado
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Eyebrow accent>{block.eyebrow}</Eyebrow>
      <p className="font-heading text-base text-fg">{block.prompt}</p>
      {block.example && <p className="text-sm italic text-fg-muted">{block.example}</p>}
      {/* Área de escritura tipo cuaderno: renglones + borde inferior en vez de caja. */}
      <div className="rounded-t-md border-b-2 border-border-strong px-1 pt-1 transition-colors focus-within:border-primary" style={NOTEBOOK_TEXTURE}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={block.max_chars}
          rows={5}
          placeholder="Escribí tu reflexión…"
          aria-label={block.prompt}
          className="w-full resize-none bg-transparent px-3 font-body text-sm text-fg placeholder:text-fg-subtle focus-visible:outline-none"
          style={{ lineHeight: "28px" }}
        />
      </div>
      <AISoonBadge variant="inline" label="Próximamente: reflexión guiada por AI" dimensionCode={dimensionCode} />

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CircularCounter current={trimmed} min={block.min_chars} reached={reachedMin} />
          <span className="text-xs text-fg-muted">
            {reachedMin ? "Listo para enviar" : `mínimo ${block.min_chars}`} · máx {block.max_chars}
          </span>
        </div>
        <Button size="sm" onClick={() => void submit()} disabled={!canSubmit || submitting}>
          {submitting ? "Enviando…" : "Enviar"}
        </Button>
      </div>
    </div>
  );
}
