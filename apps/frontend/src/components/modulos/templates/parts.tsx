import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import type { TextBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

import type { ResolvedPresentation } from "./style";

/** Props comunes de todas las plantillas de texto. */
export interface TemplateProps {
  block: TextBlock;
  /** `block.body` ya sin marcadores de citación `[n]`. */
  body: string;
  dimensionCode?: string;
  p: ResolvedPresentation;
}

/** Eyebrow del social kit: punto de acento + label en mayúsculas. */
export function TemplateEyebrow({ label, p }: { label: string; p: ResolvedPresentation }) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className={cn("h-2.5 w-2.5 shrink-0 rounded-full", p.accent.bg)} />
      <Eyebrow className={p.t.muted}>{label}</Eyebrow>
    </div>
  );
}

/** Fuente/atribución al pie (caption). Usa `citation` si existe, o `source` explícito. */
export function SourceLine({
  block,
  source,
  p,
}: {
  block: TextBlock;
  source?: string | null;
  p: ResolvedPresentation;
}) {
  const label = source ?? block.citation?.source;
  if (!label) return null;
  const url = block.citation?.doi_or_url;
  const isValidUrl = !!url && /^https?:\/\//.test(url) && !source;
  return (
    <p className={cn("font-sans text-xs", p.t.muted)}>
      Fuente: {label}
      {isValidUrl && (
        <>
          {" · "}
          <a href={url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            Ver fuente
          </a>
        </>
      )}
    </p>
  );
}

/** Two-dot de la marca (verde + ámbar). Sobre fondo oscuro el verde pasa a cream
 * para no desaparecer (p.ej. `tone: green`). */
export function TemplateDots({ p }: { p: ResolvedPresentation }) {
  return (
    <span aria-hidden className="inline-flex gap-1.5">
      <span className={cn("h-2.5 w-2.5 rounded-full", p.t.dark ? "bg-hg-cream" : "bg-hg-green")} />
      <span className="h-2.5 w-2.5 rounded-full bg-hg-amber" />
    </span>
  );
}
