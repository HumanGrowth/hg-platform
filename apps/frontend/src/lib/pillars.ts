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
// PNGs pre-renderizados del Brand Book (hexágono + pictograma por dimensión).
const PILLAR_ICON_SRC: Record<string, string> = {
  P1: "/brand/pillars/p1-carrera.png",      // rocket
  P2: "/brand/pillars/p2-proposito.png",    // star
  P3: "/brand/pillars/p3-relaciones.png",   // chat
  P4: "/brand/pillars/p4-salud.png",        // sprout
  P5: "/brand/pillars/p5-paz-interior.png", // scales
  P6: "/brand/pillars/p6-estabilidad.png",  // bulb
};

/** Código base del pilar (P6A/P6B → P6). */
export function pillarBaseCode(code: string): string {
  return code.startsWith("P6") ? "P6" : code;
}

/** Ruta del ícono hexagonal del pilar (acepta P1..P6 y P6A/P6B). */
export function pillarIconSrc(code: string): string | null {
  return PILLAR_ICON_SRC[pillarBaseCode(code)] ?? null;
}
