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
  { code: "PR", pillar: "P2", name: "Propósito y significado" },
];

/** "L2" → 2; null o código no-L (ej. "Integrado", "N1") → null. */
export function levelNum(code: string | null | undefined): number | null {
  if (!code) return null;
  const m = /^L(\d+)$/i.exec(code);
  return m ? Number(m[1]) : null;
}

/**
 * ¿La unit está bloqueada para el colaborador por progresión de nivel? Solo
 * aplica a dimensiones con niveles L (hoy Carrera). Regla (acordada): accesible
 * = nivel de la unit ≤ nivel del colaborador (su nivel y anteriores); superiores
 * bloqueados. Sin nivel del colaborador (no hizo el assessment) → todo bloqueado.
 */
export function isUnitLevelLocked(
  unitLevelCode: string,
  collaboratorLevelCode: string | null | undefined,
): boolean {
  const unitLvl = levelNum(unitLevelCode);
  if (unitLvl == null) return false; // contenido sin nivel L parseable → no bloquear
  const userLvl = levelNum(collaboratorLevelCode);
  if (userLvl == null) return true; // sin evaluación → bloqueado
  return unitLvl > userLvl;
}

function pad3(n: number): string {
  return String(n).padStart(3, "0");
}

type UnitLike = Pick<
  LearningUnitDetail | LearningUnitFeedItem,
  "slug" | "dimension_code" | "level_code" | "pillar_code" | "unit_number"
>;

/**
 * Ruta canónica anidada de una unit: `/modulos/<DIM>/<Ln>/<pillar_code>/<seq>`
 * (el `pillar_code` ya trae la letra: "P1", "AI"…). Si a la unit le falta algún
 * componente del código (legacy sin backfill), cae al slug — así los links
 * nunca quedan rotos (backward-compat).
 */
export function unitCanonicalPath(unit: UnitLike): Route {
  if (unit.pillar_code != null && unit.unit_number != null && unit.dimension_code && unit.level_code) {
    return `/modulos/${unit.dimension_code}/${unit.level_code}/${unit.pillar_code}/${pad3(
      unit.unit_number,
    )}` as Route;
  }
  return `/modulos/${unit.slug}` as Route;
}
