"use client";

import { ExternalLink } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Eyebrow } from "@/components/ui/eyebrow";
import type { TextBlock } from "@/lib/types";

const CITATION_TIER_LABEL: Record<string, string> = {
  meta_analysis: "Meta-análisis",
  rct: "Estudio controlado",
  observational: "Estudio observacional",
  expert_opinion: "Opinión experta",
};

const AUTO_COMPLETE_MS = 3000;

/** text_context/text_evidence/text_solution — no bloquea navegación: se
 * marca completed automáticamente a los 3s de estar montado (TASK B-06). */
export function TextBlockView({
  block,
  isCompleted,
  onCompleteBlock,
}: {
  block: TextBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
}) {
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

  return (
    <div className="flex flex-col gap-3">
      <Eyebrow accent>{block.eyebrow}</Eyebrow>
      <p className="whitespace-pre-line font-sans text-base text-fg">{block.body}</p>
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
}
