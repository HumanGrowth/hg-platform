"use client";

import { Info } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

const TIP_WIDTH = 240; // 15rem
const GAP = 8;
const EDGE = 8;
/** Alto aproximado para decidir si el tooltip cabe debajo o debe abrirse arriba. */
const FLIP_THRESHOLD = 160;

interface Pos {
  left: number;
  top?: number;
  bottom?: number;
}

/**
 * Icono ⓘ con tooltip explicativo. El tooltip se renderiza en un portal sobre
 * `document.body` con posición fija: las cards usan `backdrop-filter` (glass), que
 * crea un contexto de apilamiento propio, así que un `z-index` dentro de la card
 * nunca lo deja por encima de las cards vecinas. Sale por encima de todo, se
 * mantiene dentro del viewport y se cierra al hacer scroll, redimensionar o Esc.
 */
export function InfoTip({ text, label }: { text: string; label: string }) {
  const triggerRef = React.useRef<HTMLSpanElement>(null);
  const [pos, setPos] = React.useState<Pos | null>(null);
  const id = React.useId();

  const show = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.min(Math.max(EDGE, r.left), window.innerWidth - TIP_WIDTH - EDGE);
    setPos(
      r.bottom + FLIP_THRESHOLD > window.innerHeight
        ? { left, bottom: window.innerHeight - r.top + GAP }
        : { left, top: r.bottom + GAP },
    );
  }, []);
  const hide = React.useCallback(() => setPos(null), []);

  React.useEffect(() => {
    if (!pos) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos, hide]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        role="note"
        aria-label={`${label}: ${text}`}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="inline-flex shrink-0 cursor-help text-fg-subtle hover:text-fg-muted"
      >
        <Info size={14} strokeWidth={1.75} aria-hidden />
      </span>
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={id}
            role="tooltip"
            style={{ left: pos.left, top: pos.top, bottom: pos.bottom, width: TIP_WIDTH }}
            className="glass-modal pointer-events-none fixed z-[1000] p-2 text-xs font-normal normal-case tracking-normal text-fg-muted"
          >
            {text}
          </div>,
          document.body,
        )}
    </>
  );
}
