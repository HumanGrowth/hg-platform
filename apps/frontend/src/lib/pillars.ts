import type { BadgeProps } from "@/components/ui/badge";
import type { AssessmentPillarCode } from "@/lib/types";

export interface Pillar {
  id: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  name: string;
  /** clase de color de texto/acento del pilar */
  dot: string;
  badge: NonNullable<BadgeProps["variant"]>;
}

/** Las 6 dimensiones del crecimiento (colores alineados al DS). */
export const PILLARS: Pillar[] = [
  { id: "P1", name: "Carrera e impacto", dot: "bg-pillar-p1", badge: "pillar-p1" },
  { id: "P2", name: "Propósito y significado", dot: "bg-pillar-p2", badge: "pillar-p2" },
  { id: "P3", name: "Relaciones y conexión", dot: "bg-pillar-p3", badge: "pillar-p3" },
  { id: "P4", name: "Salud y bienestar", dot: "bg-pillar-p4", badge: "pillar-p4" },
  { id: "P5", name: "Paz interior y claridad", dot: "bg-pillar-p5", badge: "pillar-p5" },
  { id: "P6", name: "Estabilidad emocional y material", dot: "bg-pillar-p6", badge: "pillar-p6" },
];

// ─────────── Assessment pillar labels (7 estados: P1..P6A/P6B) ───────────

/** Nombre corto — para ejes del radar y chips compactos (reemplaza "P#"). */
export const PILLAR_SHORT_LABEL: Record<AssessmentPillarCode, string> = {
  P1: "Carrera",
  P2: "Propósito",
  P3: "Relaciones",
  P4: "Salud",
  P5: "Paz interior",
  P6A: "Resiliencia",
  P6B: "Finanzas",
};

/** Nombre completo — para headings y cards. */
export const PILLAR_FULL_LABEL: Record<AssessmentPillarCode, string> = {
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
export function pillarBadgeVariant(code: string): NonNullable<BadgeProps["variant"]> {
  const base = code.startsWith("P6") ? "p6" : code.toLowerCase();
  return `pillar-${base}` as NonNullable<BadgeProps["variant"]>;
}

// Career path usa P1..P6; el assessment usa P1..P6A/P6B. Cubrimos ambos.
const SHORT_ALL: Record<string, string> = { ...PILLAR_SHORT_LABEL, P6: "Estabilidad" };

/** Nombre corto tolerante a string (P6 career-path o P6A/P6B assessment). */
export function pillarShortName(code: string): string {
  return SHORT_ALL[code] ?? code;
}

// ─────────── Íconos hexagonales por pilar (DS v2 · HexIcon) ───────────
// PNGs del Brand Book (Web-Assets/icons · hexágono + pictograma por dimensión).
const PILLAR_ICON_SRC: Record<string, string> = {
  P1: "/icons/hex-rocket-128.png", // Carrera
  P2: "/icons/hex-star-128.png",   // Propósito
  P3: "/icons/hex-chat-128.png",   // Relaciones
  P4: "/icons/hex-sprout-128.png", // Salud
  // web-v3 decisión I: P5 (claridad) ↔ bulb · P6 (estabilidad/equilibrio) ↔
  // scales. Antes estaban cruzados y se percibía el "swap" en toda la app.
  P5: "/icons/hex-bulb-128.png",   // Paz interior y claridad
  P6: "/icons/hex-scales-128.png", // Estabilidad emocional y material
};

/** Código base del pilar (P6A/P6B → P6). */
export function pillarBaseCode(code: string): string {
  return code.startsWith("P6") ? "P6" : code;
}

// ─────────── Estilo por pilar para los templates de LU (Sprint UI) ───────────
// Clases Tailwind estáticas (no dinámicas, para no romper el purge) + la CSS
// var del hue del pilar (para glows/gradients vía `--glow-color`).
export interface PillarStyle {
  text: string;
  bg: string;
  border: string;
  /** valor CSS del hue, ej. "var(--pillar-p1)" — para --glow-color / gradients. */
  glow: string;
}

const PILLAR_STYLE: Record<string, PillarStyle> = {
  P1: { text: "text-pillar-p1", bg: "bg-pillar-p1", border: "border-pillar-p1", glow: "var(--pillar-p1)" },
  P2: { text: "text-pillar-p2", bg: "bg-pillar-p2", border: "border-pillar-p2", glow: "var(--pillar-p2)" },
  P3: { text: "text-pillar-p3", bg: "bg-pillar-p3", border: "border-pillar-p3", glow: "var(--pillar-p3)" },
  P4: { text: "text-pillar-p4", bg: "bg-pillar-p4", border: "border-pillar-p4", glow: "var(--pillar-p4)" },
  P5: { text: "text-pillar-p5", bg: "bg-pillar-p5", border: "border-pillar-p5", glow: "var(--pillar-p5)" },
  P6: { text: "text-pillar-p6", bg: "bg-pillar-p6", border: "border-pillar-p6", glow: "var(--pillar-p6)" },
};

/** Estilo del pilar (default P3/primary si el código no matchea). */
export function pillarStyle(code: string | undefined): PillarStyle {
  return PILLAR_STYLE[pillarBaseCode(code ?? "P3")] ?? PILLAR_STYLE.P3;
}

/** Ruta del ícono hexagonal del pilar (acepta P1..P6 y P6A/P6B). */
export function pillarIconSrc(code: string): string | null {
  return PILLAR_ICON_SRC[pillarBaseCode(code)] ?? null;
}
