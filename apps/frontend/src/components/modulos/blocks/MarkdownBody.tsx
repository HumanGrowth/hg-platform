"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { remarkHighlight } from "@/lib/markdown/remarkHighlight";

/**
 * Renderer de markdown para el `body` de los text_blocks (TASK polish-02).
 *
 * Estilos atados al DS v2 (no hay plugin `@tailwindcss/typography`, así que
 * cada elemento se estila a mano). `react-markdown` NO ejecuta HTML raw por
 * defecto (sin `rehype-raw`), así que es seguro contra XSS. `remark-gfm` suma
 * listas de tareas/tablas/tachado/autolinks; `remarkHighlight` suma
 * `==resaltado==` → `<mark>` ámbar (no está en GFM).
 */
const components: Components = {
  p: ({ node: _n, ...props }) => (
    <p className="leading-relaxed text-fg [&:not(:first-child)]:mt-3" {...props} />
  ),
  strong: ({ node: _n, ...props }) => <strong className="font-semibold text-fg" {...props} />,
  em: ({ node: _n, ...props }) => <em className="italic text-primary" {...props} />,
  del: ({ node: _n, ...props }) => <del className="text-fg-muted line-through" {...props} />,
  ul: ({ node: _n, ...props }) => <ul className="my-3 list-disc space-y-1 pl-6" {...props} />,
  ol: ({ node: _n, ...props }) => <ol className="my-3 list-decimal space-y-1 pl-6" {...props} />,
  li: ({ node: _n, ...props }) => <li className="leading-relaxed text-fg" {...props} />,
  blockquote: ({ node: _n, ...props }) => (
    <blockquote className="my-3 border-l-4 border-primary pl-4 italic text-fg-muted" {...props} />
  ),
  a: ({ node: _n, ...props }) => (
    <a
      className="text-primary underline underline-offset-2 hover:text-primary-hover"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  code: ({ node: _n, ...props }) => (
    <code className="rounded bg-bg-sunken px-1 py-0.5 font-mono text-sm text-fg" {...props} />
  ),
  // `==mark==` (remarkHighlight) → mdast-to-hast lo emite como <mark>.
  mark: ({ node: _n, ...props }) => (
    <mark className="rounded bg-hg-amber/20 px-1 py-0.5 text-fg" {...props} />
  ),
  // La guía prohíbe headers (rompen jerarquía) — si igual llega uno, se degrada
  // a texto en negrita en vez de un <h1> gigante.
  h1: ({ node: _n, ...props }) => (
    <p className="font-semibold text-fg [&:not(:first-child)]:mt-3" {...props} />
  ),
  h2: ({ node: _n, ...props }) => (
    <p className="font-semibold text-fg [&:not(:first-child)]:mt-3" {...props} />
  ),
  h3: ({ node: _n, ...props }) => (
    <p className="font-semibold text-fg [&:not(:first-child)]:mt-3" {...props} />
  ),
};

export function MarkdownBody({ children }: { children: string }) {
  return (
    <div className="font-sans text-base">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkHighlight]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
