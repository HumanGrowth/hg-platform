"use client";

import * as React from "react";

import { DimensionMetaphor } from "@/components/modulos/DimensionMetaphor";
import { FORMAT_CLASS, type ResolvedPresentation } from "@/components/modulos/templates/style";
import { MosaicBand, QuoteMark } from "@/components/ui/brand";
import { dimensionStyle } from "@/lib/dimension-styles";
import { cn } from "@/lib/utils";

/**
 * Shell full-screen compartido para los templates de bloque (TASK 3), alineado
 * con `UnitOpeningScreen`: alto completo, gradient sutil del pilar, metáfora del
 * pilar como header decorativo, tipografía y padding generosos. Centra el
 * contenido verticalmente y hace scroll suave sólo si no entra en pantalla.
 *
 * Con `presentation` (bloque con tags de plantilla social) el shell pasa a ser un
 * marco con el aspect-ratio de `format` (default 9:16), el fondo de `tone` y el
 * motivo de marca de `motif`. Sin `presentation` renderiza el shell clásico,
 * idéntico al de siempre.
 */
export function BlockScreenLayout({
  dimensionCode,
  children,
  className,
  presentation,
}: {
  dimensionCode?: string;
  children: React.ReactNode;
  className?: string;
  presentation?: ResolvedPresentation;
}) {
  if (presentation) {
    return (
      <SocialFrame presentation={presentation} className={className}>
        {children}
      </SocialFrame>
    );
  }
  const style = dimensionStyle(dimensionCode);
  return (
    <div
      className="relative flex h-full min-h-full w-full flex-col justify-center overflow-y-auto"
      style={{
        background: `linear-gradient(180deg, color-mix(in srgb, ${style.glow} 13%, var(--bg)) 0%, var(--bg) 52%)`,
      }}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-xl flex-col gap-6 px-6 py-10 sm:px-8 sm:py-14",
          className,
        )}
      >
        {/* Metáfora del pilar como header → identidad de la dimensión (64-80px). */}
        <span aria-hidden className="shrink-0" style={{ color: style.glow }}>
          <DimensionMetaphor code={dimensionCode ?? "P3"} className="h-16 w-16 sm:h-20 sm:w-20" />
        </span>
        {children}
      </div>
    </div>
  );
}

/** Marco de pieza social: aspect-ratio (`format`) + fondo (`tone`) + motivo (`motif`). */
function SocialFrame({
  presentation: p,
  className,
  children,
}: {
  presentation: ResolvedPresentation;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-full w-full items-center justify-center">
      <div
        data-template={p.template}
        data-tone={p.tone}
        data-format={p.format}
        className={cn(
          "relative flex flex-col overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10",
          FORMAT_CLASS[p.format],
          p.t.bg,
          p.t.fg,
        )}
      >
        {/* `quote` en una plantilla que no es Quote: marca chica decorativa arriba. */}
        {p.motif === "quote" && p.template !== "quote" && (
          <QuoteMark
            size={44}
            tone={p.accent.quote}
            className="pointer-events-none absolute right-5 top-5 opacity-60"
          />
        )}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <div className={cn("my-auto flex w-full flex-col gap-6 p-6 sm:p-10", className)}>{children}</div>
        </div>
        {p.motif === "mosaic" && <MosaicBand count={24} tile={28} className="shrink-0" />}
      </div>
    </div>
  );
}
