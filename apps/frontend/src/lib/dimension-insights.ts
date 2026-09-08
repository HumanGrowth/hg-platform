/**
 * Insight del estado de una dimensión: qué significa el estado en el que estás,
 * qué dice tu score dentro de ese estado, y qué hacer ahora.
 *
 * Hoy resuelve contra `lib/content/dimension-states.json` (templates escritos a
 * mano). **La firma es async a propósito**: cuando el texto pase a generarse con
 * IA, se reemplaza el cuerpo de `getDimensionInsight` y ninguna pantalla cambia.
 * Por la misma razón, ningún componente debe importar el JSON directamente.
 *
 * Estabilidad (ES) es el caso especial: el assessment la mide con dos
 * instrumentos independientes (P6A resiliencia + P6B finanzas) y el score de la
 * dimensión es el promedio. Mostramos los dos sub-estados en vez del promedio,
 * porque "Resiliencia media · Finanzas frágil" describe una experiencia real y
 * el promedio no describe ninguna.
 */
import content from "@/lib/content/dimension-states.json";
import { DIMENSION_SHORT_LABEL } from "@/lib/dimension-styles";
import type { Dimension } from "@/lib/dimensions";
import type { AssessmentDimensionCode, DimensionResult } from "@/lib/types";

interface StateEntry {
  /** Nombre corto del estado, para el titular. */
  label?: string;
  meaning: string;
  score_insight: string;
  tips: string[];
}

const STATES = content.states as Record<string, Record<string, StateEntry> | undefined>;
const NOT_EVALUATED = content.not_evaluated as Record<string, StateEntry | undefined>;
// Dimensiones con más de un instrumento (hoy solo ES): el score mostrado es el
// promedio, así que su lectura no puede salir del texto de un solo sub-estado.
const COMBINED = content.combined as Record<string, { score_insight: string } | undefined>;

/** Un instrumento de la dimensión (solo Estabilidad tiene más de uno). */
export interface InsightPart {
  code: AssessmentDimensionCode;
  /** "Resiliencia" / "Finanzas" — nombre del instrumento, no de la dimensión. */
  name: string;
  /** Nombre corto del estado ("Media", "Frágil"…). */
  stateLabel: string;
  meaning: string;
}

export interface DimensionInsight {
  evaluated: boolean;
  /** Titular del estado: la etiqueta del backend, o la combinación en ES. */
  headline: string;
  meaning: string;
  scoreInsight: string;
  tips: string[];
  /** Vacío salvo en Estabilidad, donde trae P6A y P6B. */
  parts: InsightPart[];
  /** `suggested_next_step` del motor de assessment (Carrera trae el cuello de botella). */
  suggestedNextStep: string | null;
}

/** Códigos del assessment que componen una dimensión de producto. */
function assessmentCodesFor(dimension: Dimension): AssessmentDimensionCode[] {
  return dimension.code === "ES" ? ["P6A", "P6B"] : [dimension.assessmentDimension];
}

function entryFor(code: string, stateCode: string): StateEntry | undefined {
  return STATES[code]?.[stateCode];
}

/**
 * Nombre corto de un estado. El `state_label` del backend no sirve de titular:
 * en Carrera es corto ("Enabling"), pero los scorers de Propósito, Resiliencia y
 * Finanzas guardan ahí la DESCRIPCIÓN completa del estado ("Sin colchón ni
 * capacidad de manejar imprevistos."). El nombre corto vive en el registro de
 * contenido; el `state_label` queda como respaldo.
 */
function shortLabel(code: string, result: DimensionResult): string {
  return entryFor(code, result.state_code)?.label ?? result.state_label;
}

function withScore(template: string, score: number): string {
  return template.replace(/\{score\}/g, String(Math.round(score)));
}

/**
 * Insight de una dimensión a partir de los resultados del assessment del user.
 * Sin resultado para la dimensión devuelve la variante "todavía no evaluaste".
 */
export async function getDimensionInsight(input: {
  dimension: Dimension;
  results: DimensionResult[];
  /** Score 0-100 de la dimensión (el mismo que muestra el radar). */
  score: number;
}): Promise<DimensionInsight> {
  const { dimension, results, score } = input;
  const codes = assessmentCodesFor(dimension);
  const found = codes
    .map((code) => ({ code, result: results.find((r) => r.dimension_code === code) }))
    .filter((x): x is { code: AssessmentDimensionCode; result: DimensionResult } =>
      Boolean(x.result),
    );

  if (found.length === 0) {
    const fallback = NOT_EVALUATED[dimension.code];
    return {
      evaluated: false,
      headline: "Todavía no evaluaste esta dimensión",
      meaning: fallback?.meaning ?? "",
      scoreInsight: fallback?.score_insight ?? "",
      tips: fallback?.tips ?? [],
      parts: [],
      suggestedNextStep: null,
    };
  }

  const parts: InsightPart[] = found.map(({ code, result }) => ({
    code,
    name: DIMENSION_SHORT_LABEL[code],
    stateLabel: shortLabel(code, result),
    meaning: entryFor(code, result.state_code)?.meaning ?? "",
  }));

  // El insight "principal" sale del primer instrumento evaluado; en ES es P6A
  // (resiliencia) y los dos estados se muestran vía `parts`.
  const primary = found[0];
  const entry = entryFor(primary.code, primary.result.state_code);
  const multi = parts.length > 1;
  // Con dos instrumentos alternamos los consejos para no dar los tres de uno solo.
  const tipPools = found.map(({ code, result }) => entryFor(code, result.state_code)?.tips ?? []);
  const tips = (multi ? interleave(tipPools) : tipPools.flat()).slice(0, 3);
  const scoreTemplate = multi
    ? (COMBINED[dimension.code]?.score_insight ?? "")
    : (entry?.score_insight ?? "");

  return {
    evaluated: true,
    headline: multi
      ? parts.map((p) => `${p.name}: ${p.stateLabel}`).join(" · ")
      : shortLabel(primary.code, primary.result),
    // En multi-instrumento el significado lo cuenta cada `part` por separado.
    meaning: multi ? "" : (entry?.meaning ?? ""),
    scoreInsight: withScore(scoreTemplate, score),
    tips,
    parts: multi ? parts : [],
    suggestedNextStep: primary.result.suggested_next_step ?? null,
  };
}

/** Round-robin entre listas (mismo criterio que el motor de ruta). */
function interleave<T>(groups: T[][]): T[] {
  const out: T[] = [];
  const rest = groups.map((g) => [...g]);
  let i = 0;
  while (rest.some((g) => g.length > 0)) {
    const g = rest[i % rest.length];
    const item = g.shift();
    if (item !== undefined) out.push(item);
    i += 1;
  }
  return out;
}
