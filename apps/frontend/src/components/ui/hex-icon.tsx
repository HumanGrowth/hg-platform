import Image from "next/image";

import { pillarIconSrc, pillarShortName } from "@/lib/pillars";
import { cn } from "@/lib/utils";

export interface HexIconProps {
  /** Código de pilar (P1..P6 o P6A/P6B). */
  pillar: string;
  /** Lado del ícono en px. */
  size?: number;
  className?: string;
}

/**
 * HexIcon (DS v2): hexágono con pictograma por dimensión. Reemplaza los chips
 * "P#" con la fingerprint visual de la marca. Si el código no matchea, no
 * renderiza nada (el callsite decide el fallback).
 */
export function HexIcon({ pillar, size = 40, className }: HexIconProps) {
  const src = pillarIconSrc(pillar);
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={pillarShortName(pillar)}
      width={size}
      height={size}
      className={cn("shrink-0 select-none", className)}
    />
  );
}
