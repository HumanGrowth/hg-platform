import type { AssessmentDimensionCode } from "@/lib/types";

/**
 * Registro canónico de las 6 dimensiones del crecimiento (Sprint Tarde · TASK 2).
 *
 * Fuente única de verdad que puentea los tres vocabularios que conviven en la app:
 *  - `code`       → código Drive/modulos ("CP", "PR", …) que guardan las units.
 *  - `careerPath` → career-path del DS (P1..P6) para color/label/ícono.
 *  - `assessmentDimension` → código del assessment para "Reevaluar" (P6 → P6A).
 *
 * Hoy sólo CP tiene contenido publicado; las otras 5 se muestran en estado
 * "Contenido próximamente" (header + reevaluar siguen funcionando).
 */
export type DimensionCode = "CP" | "PR" | "RE" | "SA" | "PI" | "ES";
export type CareerPathCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export interface Dimension {
  code: DimensionCode;
  careerPath: CareerPathCode;
  /** Código del assessment al que apunta "Reevaluar esta dimensión". */
  assessmentDimension: AssessmentDimensionCode;
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
    careerPath: "P1",
    assessmentDimension: "P1",
    name: "Carrera e impacto",
    short: "Carrera",
    description:
      "Tu desarrollo profesional y la huella que dejás. Cómo crecés en tu trabajo, tomás decisiones de carrera y generás impacto en lo que hacés.",
    hasContent: true,
  },
  {
    code: "PR",
    careerPath: "P2",
    assessmentDimension: "P2",
    name: "Propósito y significado",
    short: "Propósito",
    description:
      "El sentido que guía tus días. Qué te mueve, hacia dónde vas y cómo conectás tus acciones con algo más grande que vos.",
    hasContent: true,
  },
  {
    code: "RE",
    careerPath: "P3",
    assessmentDimension: "P3",
    name: "Relaciones y conexión",
    short: "Relaciones",
    description:
      "La calidad de tus vínculos. Cómo construís confianza, cuidás tus relaciones y te sentís parte de una comunidad.",
    hasContent: false,
  },
  {
    code: "SA",
    careerPath: "P4",
    assessmentDimension: "P4",
    name: "Salud y bienestar",
    short: "Salud",
    description:
      "El cuidado de tu cuerpo y tu energía. Hábitos de sueño, movimiento y descanso que sostienen todo lo demás.",
    hasContent: false,
  },
  {
    code: "PI",
    careerPath: "P5",
    assessmentDimension: "P5",
    name: "Paz interior y claridad",
    short: "Paz",
    description:
      "Tu mundo interno. Cómo gestionás el ruido mental, encontrás calma y ganás claridad para decidir con serenidad.",
    hasContent: false,
  },
  {
    code: "ES",
    careerPath: "P6",
    // El assessment separa P6 en resiliencia (P6A) y finanzas (P6B); "Reevaluar"
    // apunta a P6A por defecto (resiliencia emocional).
    assessmentDimension: "P6A",
    name: "Estabilidad emocional y material",
    short: "Estabilidad",
    description:
      "Tu base firme. La resiliencia para sostener los golpes y la estabilidad material que te da tranquilidad.",
    hasContent: false,
  },
];

export const DIMENSION_CODES: DimensionCode[] = DIMENSIONS.map((d) => d.code);

const BY_CODE = new Map(DIMENSIONS.map((d) => [d.code, d]));
const BY_CAREER_PATH = new Map(DIMENSIONS.map((d) => [d.careerPath, d]));

/** Dimensión por código Drive/modulos (case-insensitive). */
export function dimensionByCode(code: string | undefined): Dimension | undefined {
  if (!code) return undefined;
  return BY_CODE.get(code.toUpperCase() as DimensionCode);
}

/** Dimensión por career-path del DS (P6A/P6B → P6). */
export function dimensionByCareerPath(careerPath: string | undefined): Dimension | undefined {
  if (!careerPath) return undefined;
  const base = careerPath.startsWith("P6") ? "P6" : careerPath;
  return BY_CAREER_PATH.get(base as CareerPathCode);
}
