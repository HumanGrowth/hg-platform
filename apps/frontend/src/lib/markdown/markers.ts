/**
 * Marcadores inline de las plantillas sociales (spec §4.B) — parte pura, sin
 * React, compartida por el plugin remark, el registry (auto-detect) y la
 * plantilla Stat.
 *
 * Todos son OPT-IN: un texto sin estos marcadores no se altera.
 */

/** `[[stat: VALUE · LABEL]]` — separador `·` (o `|`). VALUE corto, sin `[`/`]`. */
export const INLINE_STAT_RE = /\[\[stat:\s*([^\]·|]{1,20}?)\s*[·|]\s*([^\]]{1,80}?)\s*\]\]/;

export interface InlineStat {
  value: string;
  label: string;
}

/** Primer `[[stat: V · L]]` del texto y el texto restante sin el marcador. */
export function extractInlineStat(text: string): { stat: InlineStat; rest: string } | null {
  const m = INLINE_STAT_RE.exec(text);
  if (!m) return null;
  const rest = (text.slice(0, m.index) + text.slice(m.index + m[0].length)).replace(/\n{3,}/g, "\n\n").trim();
  return { stat: { value: m[1].trim(), label: m[2].trim() }, rest };
}

export interface CaptionSpan {
  start: number;
  end: number;
  text: string;
}

const OPEN_PREV = /[\s(\[{"'¿¡]/;
const CLOSE_NEXT = /[\s)\]}"'.,;:!?]/;

/**
 * Spans `//texto//` de un string plano. Guardas contra falsos positivos:
 *  - el `//` de apertura no puede ir pegado a un carácter de palabra ni a `:`
 *    (→ `https://`, `ftp://`) ni a otro `/`;
 *  - el contenido no puede contener `//` (→ URLs, paths) ni empezar/terminar
 *    en espacio; tiene que estar balanceado (apertura Y cierre);
 *  - el `//` de cierre no puede ir seguido de `/` ni de carácter de palabra.
 */
export function findCaptionSpans(text: string): CaptionSpan[] {
  const spans: CaptionSpan[] = [];
  let i = 0;
  while (i < text.length - 3) {
    if (text[i] !== "/" || text[i + 1] !== "/") {
      i++;
      continue;
    }
    const prev = i === 0 ? "" : text[i - 1];
    const opensOk = (prev === "" || OPEN_PREV.test(prev)) && text[i + 2] !== "/" && !/\s/.test(text[i + 2] ?? " ");
    if (!opensOk) {
      // saltea toda la racha de `/` para no re-evaluar el 2º `/` de `://` o `///`
      while (text[i] === "/") i++;
      continue;
    }
    const close = text.indexOf("//", i + 2);
    if (close === -1) break;
    const inner = text.slice(i + 2, close);
    const next = text[close + 2] ?? "";
    const closesOk =
      inner.trim().length > 0 &&
      !/\s$/.test(inner) &&
      !inner.includes("/") &&
      !inner.includes("\n") &&
      next !== "/" &&
      (next === "" || CLOSE_NEXT.test(next));
    if (closesOk) {
      spans.push({ start: i, end: close + 2, text: inner });
      i = close + 2;
    } else {
      i += 2;
    }
  }
  return spans;
}
