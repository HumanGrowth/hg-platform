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

  // Los años de citación —"(2012)", "(2016a)"— NO son estadísticas: se quitan
  // antes de detectar para que no se tomen como dato ni ensucien el label.
  const src = text.replace(/\(\s*\d{4}[a-z]?\s*\)/g, " ").replace(/\s{2,}/g, " ");

  let best: { index: number; raw: string; spec: number } | null = null;
  const BARE_INT = HERO_PATTERNS.length - 1;
  HERO_PATTERNS.forEach((re, spec) => {
    const m = re.exec(src);
    if (!m) return;
    // Ignorar enteros "pelados" que son años sueltos (1500-2099) — sin unidad
    // (%, x, "de cada") un 4-dígitos así casi siempre es un año, no un dato.
    if (spec === BARE_INT && /^\d{4}$/.test(m[0]) && +m[0] >= 1500 && +m[0] <= 2099) return;
    if (best === null || m.index < best.index || (m.index === best.index && spec < best.spec)) {
      best = { index: m.index, raw: m[0], spec };
    }
  });
  if (best === null) return null;
  const hit = best as { index: number; raw: string; spec: number };

  const value = hit.raw.trim().replace(/\s+%/, "%").replace(/\s+x/i, "x").replace(/\s+/g, " ");
  const after = firstClause(src.slice(hit.index + hit.raw.length));
  const before = firstClause(src.slice(0, hit.index));
  let label = (after || before)
    .replace(/^[^\p{L}\d]+/u, "") //                   quita ")", ",", etc. al inicio
    .replace(/^(de|del|en|que|el|la|los|las|un|una)\s+/i, "")
    .trim();
  // Truncado en borde de palabra (nunca corta a mitad de palabra).
  if (label.length > 60) {
    const cut = label.slice(0, 60);
    const sp = cut.lastIndexOf(" ");
    label = `${(sp > 30 ? cut.slice(0, sp) : cut).trimEnd()}…`;
  }

  return { value, label };
}

export interface ChecklistItemDetection {
  n: number;
  title: string;
}

/**
 * Detecta una lista de pasos accionable en un `text_solution`. Prueba dos
 * formatos: numérico (`1.`/`1)`/`(1)`) y mnemónico de letras (`(S) (T) (O) (P)`,
 * ej. técnica STOP). Trunca a 5 items. `null` si no hay una lista clara.
 */
export function detectChecklistItems(text: string): ChecklistItemDetection[] | null {
  if (!text) return null;
  return detectNumberedList(text) ?? detectLetterList(text);
}

/** Lista numérica: `1. 2. 3.`, `1) 2)`, `(1) (2)`. Arranca en 1 y consecutiva. */
function detectNumberedList(text: string): ChecklistItemDetection[] | null {
  const re = /\(?(\d+)[.)]\s+(.+?)(?=\s+\(?\d+[.)]\s|\n|$)/g;
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

/** Mnemónico de letras: `(S) … (T) … (O) … (P)`. 2+ marcadores de una letra. */
function detectLetterList(text: string): ChecklistItemDetection[] | null {
  const re = /\(([A-Za-z])\)\s+(.+?)(?=\s*,?\s*(?:y\s+)?\([A-Za-z]\)\s|\n|$)/g;
  const items: ChecklistItemDetection[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const title = stripMarkdown(m[2].trim())
      .replace(/[.;,]+$/, "")
      .replace(/\s*,?\s*y$/i, "") // conector " , y" arrastrado del final
      .trim();
    if (title) items.push({ n: items.length + 1, title });
  }
  return items.length >= 2 ? items.slice(0, 5) : null;
}
