/**
 * Estilos ESTÁTICOS de las plantillas sociales: tone → fondo/tinta, accent →
 * color de énfasis, format → aspect-ratio. Todo son mapas de strings literales
 * (nunca `bg-${tone}` dinámico) para que el purge de Tailwind los vea.
 *
 * El accent por dimensión sale del registro canónico (`lib/dimensions.ts` +
 * `lib/dimension-styles.ts`), igual que badges y glass.
 */
import { dimensionByCareerPath, dimensionByCode } from "@/lib/dimensions";
import { dimensionBaseCode, dimensionStyle, driveToCareerPath } from "@/lib/dimension-styles";
import type {
  EmphasisLevel,
  NarrativeTone,
  PresentationAccent,
  PresentationFormat,
  PresentationMotif,
  PresentationTone,
  TextBlock,
} from "@/lib/types";

import type { MarkdownVariant } from "@/components/modulos/blocks/MarkdownBody";

import { resolveTextTemplate, type TextTemplate } from "./registry";

export type QuoteMarkTone = "orange" | "amber" | "green" | "gold";
export type PencilTone = "sage" | "green" | "orange" | "amber" | "gold";

// ─────────────────────────── format → aspect ratio ───────────────────────────

/** `story` (9:16) es el default in-app. Alto-driven salvo `wide` (ancho-driven);
 * `max-*-full` mantiene la pieza dentro del área del player (si no entra, el
 * contenido scrollea adentro del marco). */
export const FORMAT_CLASS: Record<PresentationFormat, string> = {
  story: "aspect-[9/16] h-full max-h-full max-w-full",
  feed: "aspect-square h-full max-h-full max-w-full",
  portrait: "aspect-[4/5] h-full max-h-full max-w-full",
  "li-infographic": "aspect-[4/5] h-full max-h-full max-w-full",
  wide: "aspect-video w-full max-h-full",
};

// ─────────────────────────── tone → fondo/tinta ───────────────────────────

export interface ToneClasses {
  bg: string;
  fg: string;
  muted: string;
  /** Variante de `MarkdownBody` para este fondo. */
  md: MarkdownVariant;
  /** ¿Fondo oscuro? (define el par de accent usado). */
  dark: boolean;
}

const TONE: Record<Exclude<PresentationTone, "dimension">, ToneClasses> = {
  cream: { bg: "bg-hg-cream", fg: "text-hg-ink", muted: "text-hg-olive-gray", md: "onLight", dark: false },
  green: { bg: "bg-hg-green", fg: "text-hg-cream", muted: "text-hg-cream/80", md: "onDark", dark: true },
  charcoal: { bg: "bg-hg-charcoal", fg: "text-hg-cream", muted: "text-hg-cream/70", md: "onDark", dark: true },
};

// Tono `dimension`: fondo = accent del pilar. Tinta clara u oscura según el
// contraste del hue (sage/gold/amber/orange → ink; green/slate → cream).
const DIMENSION_TONE_INK: Record<string, "ink" | "cream"> = {
  P1: "ink",
  P2: "ink",
  P3: "cream",
  P4: "ink",
  P5: "cream",
  P6: "ink",
};

function dimensionTone(careerPath: string): ToneClasses {
  const ds = dimensionStyle(careerPath);
  return DIMENSION_TONE_INK[careerPath] === "cream"
    ? { bg: ds.bg, fg: "text-hg-cream", muted: "text-hg-cream/80", md: "onDark", dark: true }
    : { bg: ds.bg, fg: "text-hg-ink", muted: "text-hg-ink/75", md: "onLight", dark: false };
}

// ─────────────────────────── accent ───────────────────────────

export interface AccentClasses {
  /** Color de texto de énfasis (número stat, QuoteMark, números de paso). */
  text: string;
  /** Fondo de énfasis (badges, dot del eyebrow). */
  bg: string;
  /** Tinta legible SOBRE `bg`. */
  onBg: string;
  quote: QuoteMarkTone;
  pencil: PencilTone;
}

const ACCENT_FIXED: Record<Exclude<PresentationAccent, "auto">, { light: AccentClasses; dark: AccentClasses }> = {
  green: {
    light: { text: "text-hg-green", bg: "bg-hg-green", onBg: "text-hg-cream", quote: "green", pencil: "green" },
    dark: { text: "text-hg-sage", bg: "bg-hg-sage", onBg: "text-hg-ink", quote: "green", pencil: "sage" },
  },
  amber: {
    light: { text: "text-hg-amber-600", bg: "bg-hg-amber", onBg: "text-hg-ink", quote: "amber", pencil: "amber" },
    dark: { text: "text-hg-amber", bg: "bg-hg-amber", onBg: "text-hg-ink", quote: "amber", pencil: "amber" },
  },
  // `orange` = riesgo/alerta (spec): no se usa como default en ningún tono.
  orange: {
    light: { text: "text-hg-orange-700", bg: "bg-hg-orange", onBg: "text-hg-ink", quote: "orange", pencil: "orange" },
    dark: { text: "text-hg-orange", bg: "bg-hg-orange", onBg: "text-hg-ink", quote: "orange", pencil: "orange" },
  },
};

const PILLAR_QUOTE_TONE: Record<string, QuoteMarkTone> = {
  P1: "orange",
  P2: "gold",
  P3: "green",
  P4: "green",
  P5: "green",
  P6: "amber",
};
const PILLAR_PENCIL_TONE: Record<string, PencilTone> = {
  P1: "orange",
  P2: "gold",
  P3: "green",
  P4: "sage",
  P5: "sage",
  P6: "amber",
};

function accentFor(accent: PresentationAccent, tone: PresentationTone, t: ToneClasses, careerPath: string): AccentClasses {
  if (accent !== "auto") return ACCENT_FIXED[accent][t.dark ? "dark" : "light"];
  // auto = pilar. Sobre fondo cream usa el hue de la dimensión; sobre verde/
  // charcoal (donde el hue de algunas dimensiones no se ve) usa ámbar, como el
  // "+34%" del social kit; sobre `dimension` el fondo YA es el hue → tinta.
  if (tone === "cream") {
    const ds = dimensionStyle(careerPath);
    return {
      text: ds.text,
      bg: ds.bg,
      onBg: DIMENSION_TONE_INK[careerPath] === "cream" ? "text-hg-cream" : "text-hg-ink",
      quote: PILLAR_QUOTE_TONE[careerPath] ?? "green",
      pencil: PILLAR_PENCIL_TONE[careerPath] ?? "sage",
    };
  }
  if (tone === "dimension") {
    return t.dark
      ? { text: "text-hg-cream", bg: "bg-hg-cream", onBg: "text-hg-ink", quote: "gold", pencil: "sage" }
      : { text: "text-hg-ink", bg: "bg-hg-ink", onBg: "text-hg-cream", quote: "orange", pencil: "green" };
  }
  return ACCENT_FIXED.amber.dark;
}

// ─────────────────────────── motif / emphasis ───────────────────────────

/** Motivo de marca por defecto de cada plantilla (si el autor no fija `motif`). */
const DEFAULT_MOTIF: Record<TextTemplate, PresentationMotif> = {
  editorial: "mosaic",
  stat: "none",
  quote: "quote",
  tip: "none",
  steps: "none", // `pencil` es opt-in: el aro con el mismo hue del badge se lee como mancha
};

/** Escalas de tipografía por énfasis — clases estáticas. */
export const EMPHASIS = {
  calm: {
    stat: "text-7xl sm:text-8xl",
    quote: "text-3xl sm:text-4xl",
    quoteMark: 72,
    body: "font-sans text-lg sm:text-xl",
    hex: 96,
  },
  bold: {
    stat: "text-8xl sm:text-9xl",
    quote: "text-4xl sm:text-5xl",
    quoteMark: 104,
    body: "font-sans text-xl sm:text-2xl",
    hex: 128,
  },
} satisfies Record<
  EmphasisLevel,
  { stat: string; quote: string; quoteMark: number; body: string; hex: number }
>;

// ─────────────────────────── resolución ───────────────────────────

export interface ResolvedPresentation {
  template: TextTemplate;
  format: PresentationFormat;
  tone: PresentationTone;
  motif: PresentationMotif;
  emphasis: EmphasisLevel;
  /** Career-path del DS (P1..P6) de la dimensión de la unit. */
  careerPath: string;
  /** Nombre corto de la dimensión (para aria/alt) o undefined. */
  dimensionName: string | undefined;
  t: ToneClasses;
  accent: AccentClasses;
}

/**
 * Junta tags del bloque + contexto (dimensión y `narrative_tone` de la unit) en
 * un objeto listo para renderizar. `emphasis_level` explícito gana; si no, un
 * `narrative_tone` "active" sube el énfasis a `bold` y el resto queda `calm`.
 *
 * `template_theme` (classic|glass) del spec §4.D no se lee: la app ya es
 * siempre glass y las piezas sociales usan la paleta fija de marca (classic).
 */
export function resolvePresentation(
  block: TextBlock,
  ctx: { dimensionCode?: string; narrativeTone?: NarrativeTone | null },
): ResolvedPresentation {
  const p = block.presentation ?? {};
  const template = resolveTextTemplate(block);
  const careerPath = dimensionBaseCode(driveToCareerPath(ctx.dimensionCode));
  const tone = p.tone ?? "cream";
  const t = tone === "dimension" ? dimensionTone(careerPath) : TONE[tone];
  return {
    template,
    format: p.format ?? "story",
    tone,
    motif: p.motif ?? DEFAULT_MOTIF[template],
    emphasis: p.emphasis_level ?? (ctx.narrativeTone === "active" ? "bold" : "calm"),
    careerPath,
    dimensionName: (dimensionByCode(ctx.dimensionCode) ?? dimensionByCareerPath(careerPath))?.short,
    t,
    accent: accentFor(p.accent ?? "auto", tone, t, careerPath),
  };
}
