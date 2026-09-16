import { subPillarName } from "@/lib/dimension-styles";
import type { AssignableUnit } from "@/lib/types";

/**
 * Corrección post-2.4: toda asignación manual de contenido (AssignModulesModal,
 * PathItemsDialog) se limita a Carrera Profesional y se elige por BLOQUE
 * (pilar o skill) — nunca por módulo individual. Este helper agrupa el
 * catálogo CP en bloques según el eje elegido (mismo patrón que el toggle
 * Dimensión/Skill de "Explorá por dimensión" en Mi Ruta).
 */

export const CP_DIMENSION = "CP";

export type BlockMode = "pillar" | "skill";

export interface ContentBlock {
  /** pillar_code o skill, según `mode`. */
  key: string;
  label: string;
  unitIds: string[];
}

/** Units de Carrera Profesional, opcionalmente acotadas a un nivel. */
export function cpCatalog(units: AssignableUnit[], levelFilter?: string): AssignableUnit[] {
  return units.filter(
    (u) => u.dimension_code === CP_DIMENSION && (!levelFilter || u.level_code === levelFilter),
  );
}

/** Niveles presentes en el catálogo CP (para el filtro de Nivel). */
export function cpLevels(units: AssignableUnit[]): string[] {
  return Array.from(new Set(cpCatalog(units).map((u) => u.level_code))).sort();
}

/** Agrupa el catálogo CP (ya acotado a un nivel si corresponde) en bloques
 * por pilar o por skill. El orden de units dentro de cada bloque respeta el
 * orden del catálogo (dimensión → nivel → pilar → unit_number, desde el
 * backend), así que alcanza con preservarlo. */
export function blocksFor(units: AssignableUnit[], mode: BlockMode): ContentBlock[] {
  const groups = new Map<string, string[]>();
  for (const u of units) {
    const keys = mode === "pillar" ? [u.pillar_code].filter((k): k is string => k != null) : u.keywords ?? [];
    for (const key of keys) {
      const ids = groups.get(key) ?? [];
      if (ids.length === 0) groups.set(key, ids);
      if (!ids.includes(u.id)) ids.push(u.id);
    }
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, unitIds]) => ({
      key,
      label: mode === "pillar" ? subPillarName(CP_DIMENSION, key) : key,
      unitIds,
    }));
}
