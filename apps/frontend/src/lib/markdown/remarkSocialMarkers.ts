/**
 * Plugin remark (sin deps nuevas) con los marcadores de las plantillas sociales
 * (spec §4.B), hermano de `remarkHighlight`:
 *
 *  - `>> texto` (a inicio de línea) → headline display. Markdown lo parsea como
 *    blockquote anidado (`>` + `>`); acá se re-mapea a un `<p class="hg-headline">`.
 *  - `[[stat: VALUE · LABEL]]` → hero-stat inline (`<span class="hg-stat">`).
 *  - `//texto//` → caption/fuente (`<small class="hg-caption">`), con guardas
 *    (ver `findCaptionSpans`): balanceado y nunca dentro de una URL.
 *
 * Todo opt-in: un nodo sin marcadores no se toca (misma identidad).
 */
import { findCaptionSpans, INLINE_STAT_RE } from "@/lib/markdown/markers";

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  position?: { start: { offset?: number } };
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

// `>>` + espacio + algo, al inicio de línea. `>>texto` (sin espacio) se deja como
// blockquote anidado: es ambiguo con una cita de una cita.
const HEADLINE_SOURCE_RE = /^>>[ \t]+\S/;

// No se busca marcadores dentro de links (URLs/autolinks) ni de código.
const SKIP_TYPES = new Set(["link", "linkReference", "inlineCode", "code", "definition", "html"]);

function el(hName: string, className: string, children: MdNode[]): MdNode {
  return { type: "hgMarker", data: { hName, hProperties: { className: ["hg-md", className] } }, children };
}

function splitInline(value: string): MdNode[] | null {
  type Piece = { start: number; end: number; node: MdNode };
  const pieces: Piece[] = [];

  const stat = INLINE_STAT_RE.exec(value);
  if (stat && stat.index !== undefined) {
    pieces.push({
      start: stat.index,
      end: stat.index + stat[0].length,
      node: el("span", "hg-stat", [
        el("span", "hg-stat-value", [{ type: "text", value: stat[1].trim() }]),
        el("span", "hg-stat-label", [{ type: "text", value: stat[2].trim() }]),
      ]),
    });
  }
  for (const span of findCaptionSpans(value)) {
    // el caption no puede pisar un stat ya encontrado
    if (pieces.some((p) => span.start < p.end && span.end > p.start)) continue;
    pieces.push({
      start: span.start,
      end: span.end,
      node: el("small", "hg-caption", [{ type: "text", value: span.text }]),
    });
  }
  if (pieces.length === 0) return null;

  pieces.sort((a, b) => a.start - b.start);
  const out: MdNode[] = [];
  let last = 0;
  for (const p of pieces) {
    if (p.start > last) out.push({ type: "text", value: value.slice(last, p.start) });
    out.push(p.node);
    last = p.end;
  }
  if (last < value.length) out.push({ type: "text", value: value.slice(last) });
  return out;
}

function walk(node: MdNode, source: string): void {
  if (!node.children || SKIP_TYPES.has(node.type)) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (
      child.type === "blockquote" &&
      child.children?.length === 1 &&
      child.children[0].type === "blockquote" &&
      HEADLINE_SOURCE_RE.test(source.slice(child.position?.start.offset ?? 0, (child.position?.start.offset ?? 0) + 200))
    ) {
      // blockquote > blockquote > paragraph  →  paragraph(headline)
      const para = child.children[0].children?.[0];
      const inner = para?.type === "paragraph" ? (para.children ?? []) : (child.children[0].children ?? []);
      const headline = el("p", "hg-headline", inner);
      walk(headline, source);
      next.push(headline);
      continue;
    }
    if (child.type === "text" && child.value && (child.value.includes("[[") || child.value.includes("//"))) {
      const parts = splitInline(child.value);
      if (parts) {
        next.push(...parts);
        continue;
      }
    }
    walk(child, source);
    next.push(child);
  }
  node.children = next;
}

/** Unified/remark plugin. Usar en `remarkPlugins={[remarkGfm, remarkHighlight, remarkSocialMarkers]}`. */
export function remarkSocialMarkers() {
  return (tree: unknown, file: { value?: unknown }): void => {
    walk(tree as MdNode, typeof file?.value === "string" ? file.value : "");
  };
}
