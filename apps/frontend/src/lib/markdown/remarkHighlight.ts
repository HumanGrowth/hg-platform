/**
 * Plugin remark mínimo (sin deps nuevas) que convierte `==texto==` en un nodo
 * que `mdast-to-hast` renderiza como `<mark>` (vía `data.hName`). GFM no
 * soporta `==highlight==`, así que lo agregamos a mano para el resaltado ámbar
 * documentado en la guía de templates (`TextBlockView` estila el `<mark>`).
 *
 * Camina el árbol mdast a mano (sin `unist-util-visit`) partiendo cada nodo
 * `text` que contenga `==...==` en text + mark + text.
 */

interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string };
}

const HIGHLIGHT_RE = /==(.+?)==/g;

function splitHighlights(value: string): MdNode[] {
  const parts: MdNode[] = [];
  let last = 0;
  for (const match of value.matchAll(HIGHLIGHT_RE)) {
    const idx = match.index ?? 0;
    if (idx > last) parts.push({ type: "text", value: value.slice(last, idx) });
    parts.push({ type: "mark", data: { hName: "mark" }, children: [{ type: "text", value: match[1] }] });
    last = idx + match[0].length;
  }
  if (parts.length === 0) return [{ type: "text", value }];
  if (last < value.length) parts.push({ type: "text", value: value.slice(last) });
  return parts;
}

function walk(node: MdNode): void {
  if (!node.children) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && child.value?.includes("==")) {
      next.push(...splitHighlights(child.value));
    } else {
      walk(child);
      next.push(child);
    }
  }
  node.children = next;
}

/** Unified/remark plugin. Usar en `remarkPlugins={[remarkGfm, remarkHighlight]}`. */
export function remarkHighlight() {
  return (tree: unknown): void => {
    walk(tree as MdNode);
  };
}
