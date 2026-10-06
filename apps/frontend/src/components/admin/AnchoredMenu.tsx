"use client";

import * as React from "react";
import { createPortal } from "react-dom";

/**
 * Menú desplegable anclado a un trigger, renderizado en un portal sobre
 * `document.body` con `position: fixed` y coordenadas de viewport.
 *
 * Por qué un portal: los contenedores glass (`backdrop-filter`) y las tablas con
 * `overflow` crean un containing block para los hijos `fixed`/`absolute`, así que
 * un menú declarado dentro de ellos se desplazaba respecto de su toggle (y se
 * recortaba). Fuera del árbol, las coordenadas de `getBoundingClientRect()` valen.
 */
export function AnchoredMenu({
  anchor,
  open,
  onClose,
  align = "left",
  width,
  role = "menu",
  label,
  className,
  children,
}: {
  anchor: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  align?: "left" | "right";
  width: number;
  role?: string;
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  const place = React.useCallback(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const rawLeft = align === "right" ? r.right - width : r.left;
    const left = Math.min(Math.max(8, rawLeft), Math.max(8, vw - width - 8));
    // Debajo del toggle; si no cabe y hay más lugar arriba, se abre hacia arriba.
    const menuH = menuRef.current?.offsetHeight ?? 0;
    const below = r.bottom + 4;
    const top =
      menuH > 0 && below + menuH > vh - 8 && r.top - 4 - menuH >= 8 ? r.top - 4 - menuH : below;
    setPos({ top, left });
  }, [anchor, align, width]);

  React.useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    // Segunda pasada con el alto real del menú ya renderizado.
    const raf = window.requestAnimationFrame(place);
    // Cerrar al scrollear/redimensionar: un menú fixed quedaría desanclado.
    const close = (e: Event) => {
      if (e.type === "scroll" && menuRef.current?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, place, onClose]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <>
      <div className="fixed inset-0 z-[60]" aria-hidden onClick={onClose} />
      <div
        ref={menuRef}
        role={role}
        aria-label={label}
        style={{
          top: pos?.top ?? 0,
          left: pos?.left ?? 0,
          width,
          visibility: pos ? "visible" : "hidden",
        }}
        className={`glass-modal fixed z-[61] max-h-64 overflow-auto ${className ?? ""}`}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
