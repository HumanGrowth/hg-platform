/**
 * Parser oficial del código de unidad del Drive (TASK 1 · fixes módulos).
 *
 * Convención (fuente de verdad = nombre de carpeta del Drive):
 *   `[<AREA>-]<DIM>-L<nivel>-P<pilar>-<seq>`   ej. `MFG-CP-L1-P2-001`
 *
 * - `area`: Área de contenido opcional (MFG/IT/CC…). Ausente o `GEN` = contenido
 *   **general** (`area = null`), visible para todas las empresas (Capa Empresa · TASK 8).
 * - `dimension`: 2-3 letras (CP, PR, …) — la dimensión del crecimiento.
 * - `level`: nivel L1..Ln (progresión).
 * - `pillar`: sub-categoría P1..Pn dentro de la dimensión.
 * - `number`: correlativo de la unidad (001..NNNN).
 *
 * Espejo de `apps/backend/src/hg/modules/learning_units/unit_code.py`.
 */

export interface UnitCode {
  area: string | null;
  dimension: string;
  level: number;
  pillar: number;
  number: number;
}

const UNIT_CODE_RE = /^(?:([A-Z]{2,3})-)?([A-Z]{2,3})-L(\d{1,2})-P(\d{1,2})-(\d{1,4})$/;
const GENERAL_SENTINEL = "GEN";

/** Parsea `MFG-CP-L1-P2-001` → `{area:"MFG", dimension:"CP", level:1, pillar:2, number:1}`.
 *  Sin Área (o `GEN`) → `area:null` (general). `null` si no matchea. */
export function parseUnitCode(code: string): UnitCode | null {
  const m = UNIT_CODE_RE.exec(code.trim().toUpperCase());
  if (!m) return null;
  const area = m[1] && m[1] !== GENERAL_SENTINEL ? m[1] : null;
  return {
    area,
    dimension: m[2],
    level: Number(m[3]),
    pillar: Number(m[4]),
    number: Number(m[5]),
  };
}

/** `true` si el string respeta la convención `[<AREA>-]<DIM>-L<n>-P<n>-<seq>`. */
export function isValidUnitCode(code: string): boolean {
  return parseUnitCode(code) !== null;
}

/** Reconstruye el código canónico; `number` se rellena a 3 dígitos (001).
 *  Antepone el Área si la unit no es general. */
export function formatUnitCode({ area, dimension, level, pillar, number }: UnitCode): string {
  const prefix = area ? `${area.toUpperCase()}-` : "";
  return `${prefix}${dimension.toUpperCase()}-L${level}-P${pillar}-${String(number).padStart(3, "0")}`;
}
