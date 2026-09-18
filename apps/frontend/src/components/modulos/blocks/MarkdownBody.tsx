"use client";

import * as React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { remarkHighlight } from "@/lib/markdown/remarkHighlight";
import { remarkSocialMarkers } from "@/lib/markdown/remarkSocialMarkers";
import type { EmphasisLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Renderer de markdown para el `body` de los text_blocks (TASK polish-02).
 *
 * Estilos atados al DS v2 (no hay plugin `@tailwindcss/typography`, así que
 * cada elemento se estila a mano). `react-markdown` NO ejecuta HTML raw por
 * defecto (sin `rehype-raw`), así que es seguro contra XSS. `remark-gfm` suma
 * listas de tareas/tablas/tachado/autolinks; `remarkHighlight` suma
 * `==resaltado==` → `<mark>` ámbar (no está en GFM); `remarkSocialMarkers` suma
 * los marcadores de las plantillas sociales (`>> headline`, `[[stat: V · L]]`,
 * `//caption//`) — todos opt-in: un texto sin ellos se renderiza igual que antes.
 *
 * `variant` re-colorea el cuerpo para fondos de plantilla social (cream/verde/
 * charcoal); sin `variant` el DOM es idéntico al histórico (sigue los tokens
 * theme-aware `text-fg` etc.).
 */
export type MarkdownVariant = "onLight" | "onDark";

interface Tokens {
  fg: string;
  muted: string;
  em: string;
  markBg: string;
  markFg: string;
  quoteBorder: string;
  stat: string;
  /** Énfasis de `==frase==` DENTRO del headline `>>` (color, no caja: la caja
   * sólida pisa la línea anterior con la interlínea ajustada de Anton). */
  headlineMark: string;
}

// Clases ESTÁTICAS (Tailwind purge): cada string completo aparece literal acá.
const TOKENS: Record<"default" | MarkdownVariant, Tokens> = {
  default: {
    fg: "text-fg",
    muted: "text-fg-muted",
    em: "text-primary",
    markBg: "bg-hg-amber/20",
    markFg: "text-fg",
    quoteBorder: "border-primary",
    stat: "text-primary",
    headlineMark: "[&_mark]:text-primary",
  },
  // Cream (o dimensión clara): colores fijos de marca, no theme-aware — la pieza
  // social se ve igual en tema claro y oscuro.
  onLight: {
    fg: "text-hg-ink",
    muted: "text-hg-olive-gray",
    em: "text-hg-green-700",
    markBg: "bg-hg-amber/30",
    markFg: "text-hg-ink",
    quoteBorder: "border-hg-green",
    stat: "text-hg-green",
    headlineMark: "[&_mark]:text-hg-orange-700",
  },
  onDark: {
    fg: "text-hg-cream",
    muted: "text-hg-cream/75",
    em: "text-hg-amber",
    markBg: "bg-hg-amber",
    markFg: "text-hg-ink",
    quoteBorder: "border-hg-amber",
    stat: "text-hg-amber",
    headlineMark: "[&_mark]:text-hg-amber",
  },
};

// Escala del headline `>>` (Anton). `bold` = más grande (emphasis_level / tono activo).
const HEADLINE_SIZE: Record<EmphasisLevel, string> = {
  calm: "text-3xl sm:text-4xl",
  bold: "text-4xl sm:text-5xl",
};
const STAT_SIZE: Record<EmphasisLevel, string> = {
  calm: "text-6xl",
  bold: "text-7xl",
};

const hasClass = (className: unknown, name: string): boolean =>
  typeof className === "string" && className.split(" ").includes(name);

function buildComponents(t: Tokens, emphasis: EmphasisLevel): Components {
  return {
    p: ({ node: _n, className, ...props }) =>
      hasClass(className, "hg-headline") ? (
        <p
          className={cn(
            "font-display uppercase leading-[1.02] tracking-tight [&:not(:first-child)]:mt-4",
            "[&_mark]:bg-transparent [&_mark]:p-0",
            t.headlineMark,
            HEADLINE_SIZE[emphasis],
            t.fg,
          )}
          {...props}
        />
      ) : (
        <p className={className ?? cn("leading-relaxed", t.fg, "[&:not(:first-child)]:mt-3")} {...props} />
      ),
    strong: ({ node: _n, ...props }) => <strong className={cn("font-semibold", t.fg)} {...props} />,
    em: ({ node: _n, ...props }) => <em className={cn("italic", t.em)} {...props} />,
    del: ({ node: _n, ...props }) => <del className={cn(t.muted, "line-through")} {...props} />,
    ul: ({ node: _n, ...props }) => <ul className="my-3 list-disc space-y-1 pl-6" {...props} />,
    ol: ({ node: _n, ...props }) => <ol className="my-3 list-decimal space-y-1 pl-6" {...props} />,
    li: ({ node: _n, ...props }) => <li className={cn("leading-relaxed", t.fg)} {...props} />,
    blockquote: ({ node: _n, ...props }) => (
      <blockquote className={cn("my-3 border-l-4", t.quoteBorder, "pl-4 italic", t.muted)} {...props} />
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
      <code className={cn("rounded bg-bg-sunken px-1 py-0.5 font-mono text-sm", t.fg)} {...props} />
    ),
    // `==mark==` (remarkHighlight) → mdast-to-hast lo emite como <mark>.
    mark: ({ node: _n, ...props }) => <mark className={cn("rounded", t.markBg, "px-1 py-0.5", t.markFg)} {...props} />,
    // `[[stat: V · L]]` (remarkSocialMarkers): hero-stat inline.
    span: ({ node: _n, className, ...props }) => {
      if (hasClass(className, "hg-stat")) return <span className="my-3 flex flex-col gap-1" {...props} />;
      if (hasClass(className, "hg-stat-value")) {
        return <span className={cn("font-display leading-none", STAT_SIZE[emphasis], t.stat)} {...props} />;
      }
      if (hasClass(className, "hg-stat-label")) {
        return <span className={cn("font-heading text-sm font-medium", t.muted)} {...props} />;
      }
      return <span className={className} {...props} />;
    },
    // `//caption//` (remarkSocialMarkers): fuente/atribución chica.
    small: ({ node: _n, className, ...props }) =>
      hasClass(className, "hg-caption") ? (
        <small className={cn("font-sans text-xs", t.muted)} {...props} />
      ) : (
        <small className={className} {...props} />
      ),
    // La guía prohíbe headers (rompen jerarquía) — si igual llega uno, se degrada
    // a texto en negrita en vez de un <h1> gigante.
    h1: ({ node: _n, ...props }) => (
      <p className={cn("font-semibold", t.fg, "[&:not(:first-child)]:mt-3")} {...props} />
    ),
    h2: ({ node: _n, ...props }) => (
      <p className={cn("font-semibold", t.fg, "[&:not(:first-child)]:mt-3")} {...props} />
    ),
    h3: ({ node: _n, ...props }) => (
      <p className={cn("font-semibold", t.fg, "[&:not(:first-child)]:mt-3")} {...props} />
    ),
  };
}

const componentsCache = new Map<string, Components>();
function componentsFor(variant: MarkdownVariant | undefined, emphasis: EmphasisLevel): Components {
  const key = `${variant ?? "default"}:${emphasis}`;
  let c = componentsCache.get(key);
  if (!c) {
    c = buildComponents(TOKENS[variant ?? "default"], emphasis);
    componentsCache.set(key, c);
  }
  return c;
}

export function MarkdownBody({
  children,
  variant,
  emphasis = "calm",
  className,
}: {
  children: string;
  variant?: MarkdownVariant;
  emphasis?: EmphasisLevel;
  /** Reemplaza la escala de texto por defecto (18px mobile → 20px desktop). */
  className?: string;
}) {
  return (
    // TASK 3: cuerpo generoso en el layout full-screen (18px mobile → 20px desktop).
    <div className={className ?? "font-sans text-lg sm:text-xl"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkHighlight, remarkSocialMarkers]}
        components={componentsFor(variant, emphasis)}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
