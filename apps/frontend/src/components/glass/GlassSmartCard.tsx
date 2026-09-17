"use client";

import { AnimatePresence, domAnimation, LazyMotion, m } from "framer-motion";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import * as React from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { cn } from "@/lib/utils";

export interface GlassSmartCardAction {
  label: string;
  icon?: React.ReactNode;
  onSelect: () => void;
}

export interface GlassSmartCardProps {
  title: string;
  children: React.ReactNode;
  /** 2–3 acciones IA mock (sin lógica real — solo estados/animación). */
  actions?: GlassSmartCardAction[];
  glow?: "green" | "amber";
  className?: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * GlassSmartCard (Sprint Glass · PASO 4). Referencia visual:
 * HG/Artifacts/Renovación glassmorphic HG/GlassSmartCard.dc.html — runtime
 * propio en React, no se porta el runtime del .dc.html.
 *
 * Wrapper de contenido con un badge glass en la esquina superior derecha
 * que en hover/focus se expande con glow reactivo y muestra 2–3 acciones IA
 * MOCK (solo estados/animación, sin lógica real).
 *
 * `<LazyMotion>` local: MotionProvider (con LazyMotion+domAnimation) solo
 * vive en (marketing)/layout — la app autenticada (donde vive este
 * componente) no tiene ese provider. Sin él, `m.div` NUNCA anima: queda
 * congelado en su `initial` (opacity:0) para siempre — el bug del "div
 * invisible con código adentro" reportado en home. Cada árbol con `m.*`
 * necesita su propio LazyMotion si no hereda uno del layout.
 */
export function GlassSmartCard({
  title,
  children,
  actions = [],
  glow = "green",
  className,
}: GlassSmartCardProps) {
  const [expanded, setExpanded] = React.useState(false);
  const shouldAnimate = useShouldAnimate();
  const badgeWrapRef = React.useRef<HTMLDivElement>(null);

  const collapse = React.useCallback(() => setExpanded(false), []);
  const expand = React.useCallback(() => setExpanded(true), []);

  React.useEffect(() => {
    if (!expanded) return;
    function onDocPointerDown(e: MouseEvent) {
      if (badgeWrapRef.current && !badgeWrapRef.current.contains(e.target as Node)) collapse();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") collapse();
    }
    document.addEventListener("mousedown", onDocPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [expanded, collapse]);

  const glowClass = glow === "amber" ? "glass-hover-amber" : "";
  const visibleActions = actions.slice(0, 3);

  const entrance = shouldAnimate
    ? {
        initial: { opacity: 0, y: 14, scale: 0.985 },
        animate: { opacity: 1, y: 0, scale: 1 },
        transition: { duration: 0.5, ease: EASE },
      }
    : {};

  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className={cn(
          "glass-surface glass-hover relative rounded-lg border border-border bg-bg-raised p-5 shadow-sm",
          glowClass,
          className,
        )}
        {...entrance}
      >
      <div
        ref={badgeWrapRef}
        className="absolute right-3 top-3 z-10"
        onMouseEnter={expand}
        onMouseLeave={collapse}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? "Cerrar acciones IA" : "Abrir acciones IA"}
          onClick={() => setExpanded((v) => !v)}
          className={cn(
            // -flat: ya vive dentro de .glass-surface (que ya tiene blur) —
            // evitar backdrop-filter anidado (ver nota "one backdrop-filter
            // per stack" en glass.css).
            "glass-fill-strong-flat flex items-center gap-2 overflow-hidden rounded-full glass-edge border text-xs font-medium text-fg shadow-sm",
            "transition-[width,border-radius,padding] duration-300 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber focus-visible:ring-offset-2",
            expanded ? "w-[190px] justify-start rounded-2xl px-3 py-2.5" : "h-9 w-9 justify-center px-0 py-0",
          )}
        >
          <Sparkles size={16} strokeWidth={1.8} className="shrink-0 text-primary" aria-hidden />
          {expanded && <span className="truncate font-heading">Copilot</span>}
          {expanded && (
            <ChevronDown
              size={14}
              strokeWidth={2}
              className="ml-auto shrink-0 rotate-180 text-fg-muted"
              aria-hidden
            />
          )}
        </button>

        <AnimatePresence>
          {expanded && visibleActions.length > 0 && (
            <m.div
              initial={shouldAnimate ? { opacity: 0, y: -6 } : undefined}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              exit={shouldAnimate ? { opacity: 0, y: -6 } : undefined}
              transition={{ duration: 0.24 }}
              className="glass-fill-strong-flat mt-2 w-[210px] rounded-2xl glass-edge border p-2 shadow-md"
            >
              <p className="mb-1.5 px-1.5 pt-1 font-sans text-[10.5px] font-semibold uppercase tracking-meta text-fg-subtle">
                Acciones IA
              </p>
              <ul className="flex flex-col gap-0.5">
                {visibleActions.map((action, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => {
                        action.onSelect();
                        collapse();
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left font-sans text-xs text-fg transition-colors hover:bg-hg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
                    >
                      {action.icon ?? (
                        <ArrowRight size={14} strokeWidth={1.9} className="shrink-0 text-primary" aria-hidden />
                      )}
                      <span className="truncate">{action.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </m.div>
          )}
        </AnimatePresence>
      </div>

        <div className="pr-10">
          <h3 className="font-heading text-md font-semibold text-fg">{title}</h3>
          <div className="mt-3">{children}</div>
        </div>
      </m.div>
    </LazyMotion>
  );
}
