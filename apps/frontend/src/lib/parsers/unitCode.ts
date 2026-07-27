/**
 * Parser oficial del código de unidad del Drive (TASK 1 · fixes módulos).
 *
 * Convención (fuente de verdad = nombre de carpeta del Drive):
 *   `<DIM>-L<nivel>-P<pilar>-<seq>`   ej. `CP-L1-P2-001`
 *
 * - `dimension`: 2-3 letras (CP, PR, …) — la dimensión del crecimiento.
 * - `level`: nivel L1..Ln (progresión).
 * - `pillar`: sub-categoría P1..Pn dentro de la dimensión.
 * - `number`: correlativo de la unidad (001..NNNN).
 *
 * OJO: hoy la app guardaba el `pillar` dentro de `pillar_code` (mislabel). Este
 * parser separa los 4 conceptos para el nuevo modelo `dimension_code` +
 * `pillar_number` + `unit_number` + `level_code`.
 */

export interface UnitCode {
  dimension: string;
  level: number;
  pillar: number;
  number: number;
}

const UNIT_CODE_RE = /^([A-Z]{2,3})-L(\d{1,2})-P(\d{1,2})-(\d{1,4})$/;

/** Parsea `CP-L1-P2-001` → `{dimension:"CP", level:1, pillar:2, number:1}`. `null` si no matchea. */
export function parseUnitCode(code: string): UnitCode | null {
  const m = UNIT_CODE_RE.exec(code.trim().toUpperCase());
  if (!m) return null;
  return { dimension: m[1], level: Number(m[2]), pillar: Number(m[3]), number: Number(m[4]) };
}

/** `true` si el string respeta la convención `<DIM>-L<n>-P<n>-<seq>`. */
export function isValidUnitCode(code: string): boolean {
  return parseUnitCode(code) !== null;
}

/** Reconstruye el código canónico; `number` se rellena a 3 dígitos (001). */
export function formatUnitCode({ dimension, level, pillar, number }: UnitCode): string {
  return `${dimension.toUpperCase()}-L${level}-P${pillar}-${String(number).padStart(3, "0")}`;
}
