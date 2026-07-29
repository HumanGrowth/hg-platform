"use client";

import { Check } from "lucide-react";
import * as React from "react";

import { BlockScreenLayout } from "@/components/modulos/blocks/BlockScreenLayout";
import { CircularCounter } from "@/components/modulos/blocks/CircularCounter";
import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { stripCitationMarkers } from "@/lib/parsers/stripCitationMarkers";
import type { ReflectionBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  onAdvance,
}: {
  block: ReflectionBlock;
  isCompleted: boolean;
  onSubmitReflection: (text: string) => Promise<void>;
  dimensionCode?: string;
  /** Avanza / cierra la unit — para el botón "Finalizar" del estado completado. */
  onAdvance?: () => void;
}) {
  const shouldAnimate = useShouldAnimate();
  const [finishing, setFinishing] = React.useState(false);

  function finish() {
    if (finishing) return;
    setFinishing(true); // dispara el glow verde
    window.setTimeout(() => onAdvance?.(), 450); // deja verlo antes de avanzar
  }
  const [text, setText] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const trimmed = text.trim().length;
  const reachedMin = trimmed >= block.min_chars;
  const canSubmit = reachedMin && text.length <= block.max_chars;
  // Bug #1: limpiar markers de citación [n] del prompt/ejemplo.
  const prompt = stripCitationMarkers(block.prompt);
  const example = block.example ? stripCitationMarkers(block.example) : null;

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
      <BlockScreenLayout dimensionCode={dimensionCode}>
      <div className="flex flex-col gap-3">
        <Eyebrow accent>{block.eyebrow}</Eyebrow>
        <p className="font-heading text-base text-fg">{prompt}</p>
        {/* Botón "Finalizar": cierra/avanza la unit con un glow verde positivo al click. */}
        <button
          type="button"
          onClick={finish}
          style={{ "--glow-color": "color-mix(in srgb, var(--color-success) 55%, transparent)" } as React.CSSProperties}
          className={cn(
            "flex items-center gap-2 self-start rounded-md border-2 border-success px-4 py-2 font-heading text-sm font-bold uppercase tracking-wide text-success transition-colors hover:bg-success-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success",
            finishing && shouldAnimate && "animate-star-glow",
          )}
        >
          <Check size={16} strokeWidth={3} /> Finalizar
        </button>
      </div>
      </BlockScreenLayout>
    );
  }

  return (
    <BlockScreenLayout dimensionCode={dimensionCode}>
    <div className="flex flex-col gap-3">
      <Eyebrow accent>{block.eyebrow}</Eyebrow>
      <p className="font-heading text-base text-fg">{prompt}</p>
      {example && <p className="text-sm italic text-fg-muted">{example}</p>}
      {/* Área de escritura tipo cuaderno: renglones + borde inferior en vez de caja. */}
      <div className="rounded-t-md border-b-2 border-border-strong px-1 pt-1 transition-colors focus-within:border-primary" style={NOTEBOOK_TEXTURE}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={block.max_chars}
          rows={5}
          placeholder="Escribí tu reflexión…"
          aria-label={prompt}
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
    </BlockScreenLayout>
  );
}
