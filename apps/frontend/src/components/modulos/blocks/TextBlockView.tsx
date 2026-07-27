"use client";

import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Lightbulb, MessageCircle, type LucideIcon } from "lucide-react";
import * as React from "react";

import { HeroDataPoint } from "@/components/modulos/blocks/HeroDataPoint";
import { InteractiveChecklist, type ChecklistEntry } from "@/components/modulos/blocks/InteractiveChecklist";
import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { Badge } from "@/components/ui/badge";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { detectChecklistItems, detectHeroStat } from "@/lib/parsers/autoDetect";
import { dimensionStyle } from "@/lib/pillars";
import type { TextBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const CITATION_TIER_LABEL: Record<string, string> = {
  meta_analysis: "Meta-análisis",
  rct: "Estudio controlado",
  observational: "Estudio observacional",
  expert_opinion: "Opinión experta",
};

/** Color del eyebrow por variante (TASK polish-02) — situación neutra,
 * evidencia ámbar, solución verde primary. */
const EYEBROW_COLOR: Record<TextBlock["variant"], string> = {
  context: "text-fg-muted",
  evidence: "text-hg-amber",
  solution: "text-primary",
};

/** Icono lateral por variante (TASK polish-03) — situación / evidencia / acción. */
const VARIANT_ICON: Record<TextBlock["variant"], LucideIcon> = {
  context: MessageCircle,
  evidence: BookOpen,
  solution: Lightbulb,
};

const AUTO_COMPLETE_MS = 3000;

/** Índice (0-based) del inicio de la lista numerada `1. ` dentro del body. */
function numberedListStart(body: string): number {
  const m = /(^|\n|\s)1\.\s/.exec(body);
  return m ? m.index + (m[1] ? m[1].length : 0) : -1;
}

/**
 * text_context/text_evidence/text_solution (Sprint UI · TASK 4/5/6). Cada
 * variante tiene su propia identidad visual:
 *  - **context:** número-marca de agua + quote-mark + border-left del pilar.
 *  - **evidence:** `HeroDataPoint` (dato grande con counter) sobre el cuerpo.
 *  - **solution:** `InteractiveChecklist` accionable + lightbulb con star-glow.
 *
 * No bloquea navegación: se marca completed automáticamente a los 3s (TASK B-06).
 */
export function TextBlockView({
  block,
  isCompleted,
  onCompleteBlock,
  dimensionCode,
}: {
  block: TextBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
  dimensionCode?: string;
}) {
  const shouldAnimate = useShouldAnimate();
  const style = dimensionStyle(dimensionCode);

  React.useEffect(() => {
    if (isCompleted) return;
    const timer = setTimeout(() => {
      void onCompleteBlock();
    }, AUTO_COMPLETE_MS);
    return () => clearTimeout(timer);
    // Solo dispara una vez al montar el bloque — no re-arma si isCompleted
    // cambia por otra vía (evita re-llamar tras completar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.id]);

  const Icon = VARIANT_ICON[block.variant];

  const eyebrow = (
    <div className={cn("flex items-center gap-1.5", EYEBROW_COLOR[block.variant])}>
      <Icon size={14} strokeWidth={2} aria-hidden />
      <span className="font-sans text-micro font-semibold uppercase tracking-meta">{block.eyebrow}</span>
    </div>
  );

  const citation = block.citation ? <CitationCard citation={block.citation} /> : null;

  let inner: React.ReactNode;
  if (block.variant === "context") {
    inner = <ContextBody block={block} style={style} eyebrow={eyebrow} citation={citation} />;
  } else if (block.variant === "evidence") {
    inner = <EvidenceBody block={block} dimensionCode={dimensionCode} eyebrow={eyebrow} citation={citation} />;
  } else {
    inner = (
      <SolutionBody
        block={block}
        dimensionCode={dimensionCode}
        shouldAnimate={shouldAnimate}
        glow={style.glow}
        eyebrow={eyebrow}
        citation={citation}
      />
    );
  }

  if (!shouldAnimate) return <>{inner}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {inner}
    </motion.div>
  );
}

// ─────────────────────────── context (T4) ───────────────────────────

/** Detecta si el cuerpo es (mayormente) una cita en blockquote markdown. */
function isQuoteBody(body: string): boolean {
  return /^\s*>/.test(body);
}

function ContextBody({
  block,
  style,
  eyebrow,
  citation,
}: {
  block: TextBlock;
  style: ReturnType<typeof dimensionStyle>;
  eyebrow: React.ReactNode;
  citation: React.ReactNode;
}) {
  const quote = isQuoteBody(block.body);
  // Si es una cita, quitamos los marcadores `>` para renderizarla como
  // pull-quote (con el quote-mark decorativo) en vez de blockquote default.
  const body = quote ? block.body.replace(/^\s*>\s?/gm, "").trim() : block.body;
  const marker = String(block.position + 1).padStart(2, "0");

  return (
    <div className="relative overflow-hidden pl-5">
      {/* border-left del pilar */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1 rounded-full"
        style={{ backgroundColor: style.glow }}
      />
      {/* número marca-de-agua */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-2 right-0 select-none font-display text-8xl leading-none text-fg opacity-[0.06]"
      >
        {marker}
      </span>
      <div className="relative flex flex-col gap-3">
        {eyebrow}
        {quote && (
          <span
            aria-hidden
            className="font-display text-6xl leading-[0.5]"
            style={{ color: style.glow, opacity: 0.5 }}
          >
            “
          </span>
        )}
        <div className={cn(quote && "text-lg italic text-fg")}>
          <MarkdownBody>{body}</MarkdownBody>
        </div>
        {citation}
      </div>
    </div>
  );
}

// ─────────────────────────── evidence (T5) ───────────────────────────

function EvidenceBody({
  block,
  dimensionCode,
  eyebrow,
  citation,
}: {
  block: TextBlock;
  dimensionCode?: string;
  eyebrow: React.ReactNode;
  citation: React.ReactNode;
}) {
  const hero = block.hero_stat ?? detectHeroStat(block.body);

  return (
    <div className="flex flex-col gap-3">
      {eyebrow}
      {hero && <HeroDataPoint value={hero.value} label={hero.label} dimensionCode={dimensionCode} />}
      <MarkdownBody>{block.body}</MarkdownBody>
      {citation}
    </div>
  );
}

// ─────────────────────────── solution (T6) ───────────────────────────

function SolutionBody({
  block,
  dimensionCode,
  shouldAnimate,
  glow,
  eyebrow,
  citation,
}: {
  block: TextBlock;
  dimensionCode?: string;
  shouldAnimate: boolean;
  glow: string;
  eyebrow: React.ReactNode;
  citation: React.ReactNode;
}) {
  const explicit = block.checklist_items;
  const detected = explicit ? null : detectChecklistItems(block.body);

  const entries: ChecklistEntry[] | null = explicit
    ? explicit.map((c) => ({ title: c.title, detail: c.detail }))
    : (detected?.map((d) => ({ title: d.title })) ?? null);

  // Cuando la lista se auto-detecta del body, el body ya contiene "1. 2. 3.":
  // mostramos sólo la intro (texto antes de la lista) para no duplicarla.
  let introBody = block.body;
  if (detected) {
    const start = numberedListStart(block.body);
    introBody = start > 0 ? block.body.slice(0, start).trim() : "";
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full bg-bg-raised text-primary",
            shouldAnimate && "animate-star-glow",
          )}
          style={{ "--glow-color": `color-mix(in srgb, ${glow} 55%, transparent)` } as React.CSSProperties}
          aria-hidden
        >
          <Lightbulb size={18} strokeWidth={2} />
        </span>
        {eyebrow}
      </div>
      {introBody && <MarkdownBody>{introBody}</MarkdownBody>}
      {entries && <InteractiveChecklist items={entries} storageKey={block.id} dimensionCode={dimensionCode} />}
      {citation}
    </div>
  );
}

// ─────────────────────────── shared ───────────────────────────

function CitationCard({ citation }: { citation: NonNullable<TextBlock["citation"]> }) {
  const isValidUrl = /^https?:\/\//.test(citation.doi_or_url);
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-bg-sunken p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge>{CITATION_TIER_LABEL[citation.tier] ?? citation.tier}</Badge>
        <span className="text-xs text-fg-muted">
          {citation.source} · {citation.year}
        </span>
      </div>
      <p className="text-sm text-fg-muted">{citation.text}</p>
      {isValidUrl && (
        <a
          href={citation.doi_or_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 font-sans text-xs font-semibold text-primary hover:underline"
        >
          Ver fuente <ExternalLink size={12} strokeWidth={1.75} />
        </a>
      )}
    </div>
  );
}
