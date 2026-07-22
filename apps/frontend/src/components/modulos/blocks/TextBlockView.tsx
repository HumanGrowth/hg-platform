"use client";

import { motion } from "framer-motion";
import { BookOpen, ExternalLink, Lightbulb, MessageCircle, type LucideIcon } from "lucide-react";
import * as React from "react";

import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { Badge } from "@/components/ui/badge";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
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

/** text_context/text_evidence/text_solution — no bloquea navegación: se
 * marca completed automáticamente a los 3s de estar montado (TASK B-06). El
 * `body` se renderiza como markdown (TASK polish-02). */
export function TextBlockView({
  block,
  isCompleted,
  onCompleteBlock,
}: {
  block: TextBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}) {
  const shouldAnimate = useShouldAnimate();

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

  const isValidUrl = block.citation && /^https?:\/\//.test(block.citation.doi_or_url);

  const Icon = VARIANT_ICON[block.variant];

  const content = (
    <div className="flex flex-col gap-3">
      <div className={cn("flex items-center gap-1.5", EYEBROW_COLOR[block.variant])}>
        <Icon size={14} strokeWidth={2} aria-hidden />
        <span className="font-sans text-micro font-semibold uppercase tracking-meta">
          {block.eyebrow}
        </span>
      </div>
      <MarkdownBody>{block.body}</MarkdownBody>
      {block.citation && (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-border bg-bg-sunken p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{CITATION_TIER_LABEL[block.citation.tier] ?? block.citation.tier}</Badge>
            <span className="text-xs text-fg-muted">
              {block.citation.source} · {block.citation.year}
            </span>
          </div>
          <p className="text-sm text-fg-muted">{block.citation.text}</p>
          {isValidUrl && (
            <a
              href={block.citation.doi_or_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1 font-sans text-xs font-semibold text-primary hover:underline"
            >
              Ver fuente <ExternalLink size={12} strokeWidth={1.75} />
            </a>
          )}
        </div>
      )}
    </div>
  );

  if (!shouldAnimate) return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {content}
    </motion.div>
  );
}
