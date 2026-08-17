import type { BadgeProps } from "@/components/ui/badge";
import type { AssessmentDimensionCode } from "@/lib/types";

// Estilos/labels/íconos del DS para las 6 DIMENSIONES (por su career-path code
// P1..P6, y los códigos de assessment P1..P6A/P6B). El PILAR real (sub-categoría
// dentro de una dimensión) vive al final: `subPillarName` / `SUB_PILLAR_NAMES`.

export interface DimensionMeta {
  id: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  name: string;
  /** clase de color de texto/acento de la dimensión */
  dot: string;
  badge: NonNullable<BadgeProps["variant"]>;
}

/** Las 6 dimensiones del crecimiento (colores alineados al DS). */
export const DIMENSIONS_META: DimensionMeta[] = [
  { id: "P1", name: "Carrera e impacto", dot: "bg-dimension-p1", badge: "dimension-p1" },
  { id: "P2", name: "Propósito y significado", dot: "bg-dimension-p2", badge: "dimension-p2" },
  { id: "P3", name: "Relaciones y conexión", dot: "bg-dimension-p3", badge: "dimension-p3" },
  { id: "P4", name: "Salud y bienestar", dot: "bg-dimension-p4", badge: "dimension-p4" },
  { id: "P5", name: "Paz interior y claridad", dot: "bg-dimension-p5", badge: "dimension-p5" },
  { id: "P6", name: "Estabilidad emocional y material", dot: "bg-dimension-p6", badge: "dimension-p6" },
];

// ─────────── Labels de dimensión (7 estados: P1..P6A/P6B) ───────────

/** Nombre corto — para ejes del radar y chips compactos (reemplaza "P#"). */
export const DIMENSION_SHORT_LABEL: Record<AssessmentDimensionCode, string> = {
  P1: "Carrera",
  P2: "Propósito",
  P3: "Relaciones",
  P4: "Salud",
  P5: "Paz interior",
  P6A: "Resiliencia",
  P6B: "Finanzas",
};

/** Nombre completo — para headings y cards. */
export const DIMENSION_FULL_LABEL: Record<AssessmentDimensionCode, string> = {
  P1: "Carrera e impacto",
  P2: "Propósito y significado",
  P3: "Relaciones y conexión",
  P4: "Salud y bienestar",
  P5: "Paz interior y claridad",
  P6A: "Resiliencia emocional",
  P6B: "Bienestar financiero",
};

/** Variante de Badge del DS (P6/P6A/P6B comparten el color de P6). Acepta
 * tanto códigos de assessment (P6A/P6B) como de career path (P1..P6). */
export function dimensionBadgeVariant(code: string): NonNullable<BadgeProps["variant"]> {
  const base = code.startsWith("P6") ? "p6" : code.toLowerCase();
  return `dimension-${base}` as NonNullable<BadgeProps["variant"]>;
}

// Career path usa P1..P6; el assessment usa P1..P6A/P6B. Cubrimos ambos.
const SHORT_ALL: Record<string, string> = { ...DIMENSION_SHORT_LABEL, P6: "Estabilidad" };

/** Nombre corto tolerante a string (P6 career-path o P6A/P6B assessment). */
export function dimensionShortName(code: string): string {
  return SHORT_ALL[code] ?? code;
}

// ─────────── Íconos hexagonales por dimensión (DS v2 · HexIcon) ───────────
// PNGs del Brand Book (Web-Assets/icons · hexágono + pictograma por dimensión).
const DIMENSION_ICON_SRC: Record<string, string> = {
  P1: "/icons/hex-rocket-128.png", // Carrera
  P2: "/icons/hex-star-128.png",   // Propósito
  P3: "/icons/hex-chat-128.png",   // Relaciones
  P4: "/icons/hex-sprout-128.png", // Salud
  // web-v3 decisión I: P5 (claridad) ↔ bulb · P6 (estabilidad/equilibrio) ↔
  // scales. Antes estaban cruzados y se percibía el "swap" en toda la app.
  P5: "/icons/hex-bulb-128.png",   // Paz interior y claridad
  P6: "/icons/hex-scales-128.png", // Estabilidad emocional y material
};

/** Código base de la dimensión (P6A/P6B → P6). */
export function dimensionBaseCode(code: string): string {
  return code.startsWith("P6") ? "P6" : code;
}

// ─────────── Estilo por dimensión para los templates de LU (Sprint UI) ───────────
// Clases Tailwind estáticas (no dinámicas, para no romper el purge) + la CSS
// var del hue de la dimensión (para glows/gradients vía `--glow-color`).
export interface DimensionStyle {
  text: string;
  bg: string;
  border: string;
  /** valor CSS del hue, ej. "var(--dimension-p1)" — para --glow-color / gradients. */
  glow: string;
}

const DIMENSION_STYLE: Record<string, DimensionStyle> = {
  P1: { text: "text-dimension-p1", bg: "bg-dimension-p1", border: "border-dimension-p1", glow: "var(--dimension-p1)" },
  P2: { text: "text-dimension-p2", bg: "bg-dimension-p2", border: "border-dimension-p2", glow: "var(--dimension-p2)" },
  P3: { text: "text-dimension-p3", bg: "bg-dimension-p3", border: "border-dimension-p3", glow: "var(--dimension-p3)" },
  P4: { text: "text-dimension-p4", bg: "bg-dimension-p4", border: "border-dimension-p4", glow: "var(--dimension-p4)" },
  P5: { text: "text-dimension-p5", bg: "bg-dimension-p5", border: "border-dimension-p5", glow: "var(--dimension-p5)" },
  P6: { text: "text-dimension-p6", bg: "bg-dimension-p6", border: "border-dimension-p6", glow: "var(--dimension-p6)" },
};

// ─────────── Dimensión del Drive (CP…) → career-path del DS (P1..P6) ───────────
// Las units guardan el código Drive (`dimension_code` = "CP", …). El DS colorea
// por career-path (P1..P6). Este registro puentea ambos para color/label.
// Registro completo de las 6 dimensiones en `lib/dimensions.ts` (fuente de verdad).
const DRIVE_TO_CAREER_PATH: Record<string, string> = {
  CP: "P1",
  PR: "P2",
  RE: "P3",
  SA: "P4",
  PI: "P5",
  ES: "P6",
};

/** Career-path del DS (P1..P6) de una dimensión Drive; si ya es P1..P6, passthrough. */
export function driveToCareerPath(code: string | undefined): string {
  if (!code) return "P3";
  const up = code.toUpperCase();
  return DRIVE_TO_CAREER_PATH[up] ?? up;
}

/** Estilo del DS para una dimensión, aceptando Drive (CP→P1), career-path
 * (P1..P6) o assessment (P6A/P6B). Default P3/primary si no matchea. */
export function dimensionStyle(code: string | undefined): DimensionStyle {
  return DIMENSION_STYLE[dimensionBaseCode(driveToCareerPath(code ?? "P3"))] ?? DIMENSION_STYLE.P3;
}

/** Ruta del ícono hexagonal de la dimensión (acepta P1..P6 y P6A/P6B). */
export function dimensionIconSrc(code: string): string | null {
  return DIMENSION_ICON_SRC[dimensionBaseCode(code)] ?? null;
}

/**
 * Nombres de los PILARES (sub-categorías) dentro de una dimensión (cierre-beta
 * TASK 2.3). El `pillar_code` ("P1".."P5", "AI"…) es un sub-grupo DENTRO de la
 * dimensión, no una dimensión propia — por eso el nombre depende del
 * `dimension_code`. Hoy solo está definida Carrera (CP); las otras caen al
 * fallback "Pilar N".
 */
export const SUB_PILLAR_NAMES: Record<string, Record<string, string>> = {
  CP: {
    P1: "Adaptabilidad de aprendizaje",
    P2: "Excelencia operativa y colaboración",
    P3: "Experticia y pensamiento estratégico",
    P4: "Comunicación e influencia",
    P5: "Inteligencia emocional y social",
  },
};

export function subPillarName(dimensionCode: string | undefined, pillarCode: string): string {
  const named = dimensionCode ? SUB_PILLAR_NAMES[dimensionCode]?.[pillarCode] : undefined;
  // Fallback: "P3" → "Pilar 3"; códigos nombrados ("AI") → "Pilar AI".
  return named ?? `Pilar ${pillarCode.replace(/^P(?=\d)/, "")}`;
}
