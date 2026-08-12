"use client";

import * as React from "react";

import { DimensionMetaphor } from "@/components/modulos/DimensionMetaphor";
import { dimensionStyle } from "@/lib/dimension-styles";
import { cn } from "@/lib/utils";

/**
 * Shell full-screen compartido para los templates de bloque (TASK 3), alineado
 * con `UnitOpeningScreen`: alto completo, gradient sutil del pilar, metáfora del
 * pilar como header decorativo, tipografía y padding generosos. Centra el
 * contenido verticalmente y hace scroll suave sólo si no entra en pantalla.
 */
export function BlockScreenLayout({
  dimensionCode,
  children,
  className,
}: {
  dimensionCode?: string;
  children: React.ReactNode;
  className?: string;
}) {
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
