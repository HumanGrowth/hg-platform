import * as React from "react";

import { cn } from "@/lib/utils";

/** MotifDots — la fingerprint verde+ámbar de la marca (bullets, dividers, loading). */
export function MotifDots({
  size = 12,
  gap,
  vertical = false,
  className,
  ...rest
}: { size?: number; gap?: number; vertical?: boolean } & React.HTMLAttributes<HTMLSpanElement>) {
  const g = gap ?? size * 0.5;
  return (
    <span
      aria-hidden
      className={cn("inline-flex", vertical ? "flex-col" : "flex-row", className)}
      style={{ gap: g }}
      {...rest}
    >
      <span style={{ width: size, height: size }} className="rounded-full bg-hg-green" />
      <span style={{ width: size, height: size }} className="rounded-full bg-hg-amber" />
    </span>
  );
}

type QuoteTone = "orange" | "amber" | "green" | "gold";
const TONE: Record<QuoteTone, string> = {
  orange: "text-hg-orange",
  amber: "text-hg-amber",
  green: "text-hg-green",
  gold: "text-hg-gold",
};

/** QuoteMark — glifo de comillas en bloque (banners de marca). */
export function QuoteMark({
  size = 64,
  tone = "amber",
  closing = false,
  className,
  ...rest
}: { size?: number; tone?: QuoteTone; closing?: boolean } & React.SVGProps<SVGSVGElement>) {
  const glyph = "M2 2 H40 V34 L22 62 H2 Z";
  return (
    <svg
      width={size}
      height={size * (64 / 100)}
      viewBox="0 0 100 64"
      aria-hidden
      className={cn("block fill-current", TONE[tone], className)}
      style={{ transform: closing ? "rotate(180deg)" : undefined }}
      {...rest}
    >
      <path d={glyph} />
      <path d={glyph} transform="translate(52 0)" />
    </svg>
  );
}

type PencilTone = "sage" | "green" | "orange" | "amber" | "gold";
const PENCIL: Record<PencilTone, string> = {
  sage: "stroke-hg-sage",
  green: "stroke-hg-green",
  orange: "stroke-hg-orange",
  amber: "stroke-hg-amber",
  gold: "stroke-hg-gold",
};

/** PencilCircle — anillo de énfasis "dibujado a mano" alrededor del contenido. */
export function PencilCircle({
  children,
  tone = "sage",
  strokeWidth = 4,
  className,
}: {
  children: React.ReactNode;
  tone?: PencilTone;
  strokeWidth?: number;
  className?: string;
}) {
  const d =
    "M158 16 C 66 2, 14 26, 20 52 C 25 80, 118 98, 176 82 C 214 70, 200 22, 108 14";
  return (
    <span className={cn("relative inline-block px-3.5 py-1.5", className)}>
      <svg
        viewBox="0 0 210 100"
        preserveAspectRatio="none"
        aria-hidden
        className={cn("pointer-events-none absolute inset-0 h-full w-full overflow-visible", PENCIL[tone])}
      >
        <path
          d={d}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <span className="relative">{children}</span>
    </span>
  );
}

type MosaicTone = "green" | "amber" | "cream" | "gold" | "sage" | "ink" | "orange";
// Clases ESTÁTICAS (purge): un mapa por rol, nunca `bg-hg-${tone}`.
const MOSAIC_BG: Record<MosaicTone, string> = {
  green: "bg-hg-green",
  amber: "bg-hg-amber",
  cream: "bg-hg-cream",
  gold: "bg-hg-gold",
  sage: "bg-hg-sage",
  ink: "bg-hg-ink",
  orange: "bg-hg-orange",
};
const MOSAIC_DEFAULT_BG: MosaicTone[] = ["green", "amber", "sage", "gold"];
const MOSAIC_DEFAULT_FG: MosaicTone[] = ["cream", "green", "ink", "cream"];

/**
 * MosaicBand — franja de mosaico de la marca (social kit): una fila de fichas
 * cuadradas con un círculo interior. Determinística por `seed` (mismo render en
 * SSR/CSR y en snapshots). Decorativa (`aria-hidden`).
 */
export function MosaicBand({
  count = 12,
  tile = 28,
  seed = 1,
  bgTones = MOSAIC_DEFAULT_BG,
  fgTones = MOSAIC_DEFAULT_FG,
  className,
  ...rest
}: {
  count?: number;
  tile?: number;
  seed?: number;
  bgTones?: MosaicTone[];
  fgTones?: MosaicTone[];
} & React.HTMLAttributes<HTMLDivElement>) {
  let state = seed * 9301 + 49297;
  const next = (n: number) => {
    state = (state * 9301 + 49297) % 233280;
    return Math.floor((state / 233280) * n);
  };
  const tiles = Array.from({ length: count }, (_, i) => ({
    key: i,
    bg: bgTones[next(bgTones.length)],
    fg: fgTones[next(fgTones.length)],
  }));
  return (
    <div aria-hidden className={cn("flex w-full overflow-hidden", className)} {...rest}>
      {tiles.map((t) => (
        <span
          key={t.key}
          style={{ width: tile, height: tile }}
          className={cn("flex shrink-0 items-center justify-center", MOSAIC_BG[t.bg])}
        >
          <span
            style={{ width: tile * 0.46, height: tile * 0.46 }}
            className={cn("rounded-full", MOSAIC_BG[t.fg])}
          />
        </span>
      ))}
    </div>
  );
}
