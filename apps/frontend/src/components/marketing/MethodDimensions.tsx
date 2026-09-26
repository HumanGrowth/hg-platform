"use client";

import { DIM_COLORS, hexToRgbTriplet } from "@/components/marketing/fx/dim-colors";
import { RevealGroup } from "@/components/marketing/fx/Reveal";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { HexIcon } from "@/components/ui/hex-icon";

export interface MethodPillar {
  code: string;
  name: string;
  tag: string;
  desc: string;
}

/**
 * Las 6 dimensiones en /metodo, versión user-friendly (web-v3-08 · decisión K):
 * qué mide + ruta de crecimiento, sin jerga académica ni citas.
 */
export function MethodDimensions({ pillars }: { pillars: readonly MethodPillar[] }) {
  return (
    <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3" step={0.07}>
      {pillars.map((p, i) => (
        <SpotlightCard
          key={p.code}
          glow={hexToRgbTriplet(DIM_COLORS[i] ?? DIM_COLORS[0])}
          className="flex h-full flex-col gap-3 p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <HexIcon pillar={p.code} size={40} />
            <span className="font-mono text-xs text-fg-subtle">{p.tag}</span>
          </div>
          <h3 className="font-heading text-lg font-semibold leading-tight text-fg">{p.name}</h3>
          <p className="text-sm leading-[1.55] text-fg-muted">{p.desc}</p>
        </SpotlightCard>
      ))}
    </RevealGroup>
  );
}
