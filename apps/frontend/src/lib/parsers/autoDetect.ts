/**
 * Helpers puros de auto-detección para los templates de LU (Sprint UI · TASK 13).
 *
 * `detectHeroStat` — primer número destacable de un `text_evidence`.
 * `detectChecklistItems` — lista `1. 2. 3.` de un `text_solution`.
 *
 * (El parsing de markdown ya lo hace `MarkdownBody` / `remarkHighlight`; no se
 * recrea acá.) Ambos devuelven `null` si no detectan nada, para no romper el
 * render — el override manual del mentor (`hero_stat` / `checklist_items`)
 * siempre tiene prioridad en el componente.
 */

/** Quita la sintaxis markdown de un fragmento para usarlo como label/título. */
function stripMarkdown(s: string): string {
  return s
    .replace(/[*_`~]|==|#/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Primera "cláusula" (hasta puntuación fuerte) de un fragmento, sin markdown. */
function firstClause(s: string): string {
  return stripMarkdown(s.split(/[.\n!?;]/)[0] ?? "");
}

// Patrones de número, de más específico a más general. El orden importa para
// desempatar cuando dos patrones matchean en la misma posición.
const HERO_PATTERNS: RegExp[] = [
  /\d+\s+de\s+cada\s+\d+/i, // "3 de cada 4"
  /\d+(?:[.,]\d+)?\s*%/, //     "23%", "23,5 %"
  /\d+(?:[.,]\d+)?\s*x\b/i, //  "2x", "1.5x"
  /\d+[.,]\d+/, //              "4,7" / "4.7"
  /\d+/, //                     "23"
];

export interface HeroStatDetection {
  value: string;
  label: string;
}

/**
 * Detecta el primer número destacable del texto y arma `{value, label}`.
 * `value` normaliza espacios (`23 %` → `23%`); `label` es la cláusula que sigue
 * al número (o la que lo precede si el número cierra la oración).
 */
export function detectHeroStat(text: string): HeroStatDetection | null {
  if (!text) return null;

  let best: { index: number; raw: string; spec: number } | null = null;
  HERO_PATTERNS.forEach((re, spec) => {
    const m = re.exec(text);
    if (!m) return;
    if (best === null || m.index < best.index || (m.index === best.index && spec < best.spec)) {
      best = { index: m.index, raw: m[0], spec };
    }
  });
  if (best === null) return null;
  const hit = best as { index: number; raw: string; spec: number };

  const value = hit.raw.trim().replace(/\s+%/, "%").replace(/\s+x/i, "x").replace(/\s+/g, " ");
  const after = firstClause(text.slice(hit.index + hit.raw.length));
  const before = firstClause(text.slice(0, hit.index));
  let label = (after || before).replace(/^(de|del|en|que|el|la|los|las|un|una)\s+/i, "").trim();
  if (label.length > 60) label = `${label.slice(0, 57).trimEnd()}…`;

  return { value, label };
}

export interface ChecklistItemDetection {
  n: number;
  title: string;
}

/**
 * Detecta una lista numerada `1. 2. 3.` (inline o multilínea). Sólo devuelve la
 * secuencia que **arranca en 1** y es consecutiva (evita falsos positivos como
 * un año "2020."). Trunca a 5 items. `null` si hay menos de 2.
 */
export function detectChecklistItems(text: string): ChecklistItemDetection[] | null {
  if (!text) return null;

  const re = /(\d+)\.\s+(.+?)(?=\s+\d+\.\s|\n|$)/g;
  const raw: ChecklistItemDetection[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const title = stripMarkdown(m[2].trim()).replace(/[.;,]+$/, "").trim();
    raw.push({ n: Number.parseInt(m[1], 10), title });
  }

  const start = raw.findIndex((it) => it.n === 1);
  if (start === -1) return null;

  const seq: ChecklistItemDetection[] = [];
  let expected = 1;
  for (let i = start; i < raw.length && raw[i].n === expected; i++, expected++) {
    if (raw[i].title.length > 0) seq.push(raw[i]);
  }
  return seq.length >= 2 ? seq.slice(0, 5) : null;
}
