import type { Route } from "next";

import type { LearningUnitDetail, LearningUnitFeedItem } from "@/lib/types";

/**
 * Dimensiones del Drive para el indexing de /modulos (TASK 1). Hoy solo existe
 * CP (Carrera Profesional); las otras 5 se agregan acá cuando Jorge las cree.
 * `pillar` = career_path del DS (para colores/labels/filtro by-pillar).
 */
export interface DimensionMeta {
  code: string; // código Drive (CP…)
  pillar: string; // career_path DS (P1..P6)
  name: string;
}

export const DIMENSIONS: DimensionMeta[] = [
  { code: "CP", pillar: "P1", name: "Carrera e impacto" },
];

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

type UnitLike = Pick<
  LearningUnitDetail | LearningUnitFeedItem,
  "slug" | "dimension_code" | "level_code" | "pillar_number" | "unit_number"
>;

/**
 * Ruta canónica anidada de una unit: `/modulos/<DIM>/<Ln>/P<n>/<seq>`. Si a la
 * unit le falta algún componente del código (legacy sin backfill), cae al slug
 * — así los links nunca quedan rotos (backward-compat).
 */
export function unitCanonicalPath(unit: UnitLike): Route {
  if (unit.pillar_number != null && unit.unit_number != null && unit.dimension_code && unit.level_code) {
    return `/modulos/${unit.dimension_code}/${unit.level_code}/P${unit.pillar_number}/${pad3(
      unit.unit_number,
    )}` as Route;
  }
  return `/modulos/${unit.slug}` as Route;
}
