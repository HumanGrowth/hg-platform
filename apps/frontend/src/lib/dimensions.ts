import type { AssessmentPillarCode } from "@/lib/types";

/**
 * Registro canónico de las 6 dimensiones del crecimiento (Sprint Tarde · TASK 2).
 *
 * Fuente única de verdad que puentea los tres vocabularios que conviven en la app:
 *  - `code`   → código Drive/modulos ("CP", "PR", …) que guardan las units.
 *  - `pillar` → pilar del DS (P1..P6) para color/label/ícono.
 *  - `assessmentPillar` → pilar del assessment para "Reevaluar" (P6 → P6A).
 *
 * Hoy sólo CP tiene contenido publicado; las otras 5 se muestran en estado
 * "Contenido próximamente" (header + reevaluar siguen funcionando).
 */
export type DimensionCode = "CP" | "PR" | "RE" | "SA" | "PI" | "ES";
export type PillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export interface Dimension {
  code: DimensionCode;
  pillar: PillarCode;
  /** Pilar del assessment al que apunta "Reevaluar esta dimensión". */
  assessmentPillar: AssessmentPillarCode;
  /** Nombre completo (headings, display). */
  name: string;
  /** Label corto (radar, chips) — una palabra cuando se puede. */
  short: string;
  /** Descripción 2-3 líneas — editable por Andy. */
  description: string;
  /** ¿Tiene units publicadas hoy? */
  hasContent: boolean;
}

export const DIMENSIONS: Dimension[] = [
  {
    code: "CP",
    pillar: "P1",
    assessmentPillar: "P1",
    name: "Carrera e impacto",
    short: "Carrera",
    description:
      "Tu desarrollo profesional y la huella que dejás. Cómo crecés en tu trabajo, tomás decisiones de carrera y generás impacto en lo que hacés.",
    hasContent: true,
  },
  {
    code: "PR",
    pillar: "P2",
    assessmentPillar: "P2",
    name: "Propósito y significado",
    short: "Propósito",
    description:
      "El sentido que guía tus días. Qué te mueve, hacia dónde vas y cómo conectás tus acciones con algo más grande que vos.",
    hasContent: false,
  },
  {
    code: "RE",
    pillar: "P3",
    assessmentPillar: "P3",
    name: "Relaciones y conexión",
    short: "Relaciones",
    description:
      "La calidad de tus vínculos. Cómo construís confianza, cuidás tus relaciones y te sentís parte de una comunidad.",
    hasContent: false,
  },
  {
    code: "SA",
    pillar: "P4",
    assessmentPillar: "P4",
    name: "Salud y bienestar",
    short: "Salud",
    description:
      "El cuidado de tu cuerpo y tu energía. Hábitos de sueño, movimiento y descanso que sostienen todo lo demás.",
    hasContent: false,
  },
  {
    code: "PI",
    pillar: "P5",
    assessmentPillar: "P5",
    name: "Paz interior y claridad",
    short: "Paz",
    description:
      "Tu mundo interno. Cómo gestionás el ruido mental, encontrás calma y ganás claridad para decidir con serenidad.",
    hasContent: false,
  },
  {
    code: "ES",
    pillar: "P6",
    // El assessment separa P6 en resiliencia (P6A) y finanzas (P6B); "Reevaluar"
    // apunta a P6A por defecto (resiliencia emocional).
    assessmentPillar: "P6A",
    name: "Estabilidad emocional y material",
    short: "Estabilidad",
    description:
      "Tu base firme. La resiliencia para sostener los golpes y la estabilidad material que te da tranquilidad.",
    hasContent: false,
  },
];

export const DIMENSION_CODES: DimensionCode[] = DIMENSIONS.map((d) => d.code);

const BY_CODE = new Map(DIMENSIONS.map((d) => [d.code, d]));
const BY_PILLAR = new Map(DIMENSIONS.map((d) => [d.pillar, d]));

/** Dimensión por código Drive/modulos (case-insensitive). */
export function dimensionByCode(code: string | undefined): Dimension | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toUpperCase() as DimensionCode);
}

/** Dimensión por pilar del DS (P6A/P6B → P6). */
export function dimensionByPillar(pillar: string | undefined): Dimension | undefined {
  if (!pillar) return undefined;
  const base = pillar.startsWith("P6") ? "P6" : pillar;
  return BY_PILLAR.get(base as PillarCode);
}
