"use client";

import * as React from "react";

export interface ElementBox {
  width: number;
  height: number;
  /** `landscape` si el área es claramente más ancha que alta (>1.15). Con tamaño
   * 0 (SSR / aún sin medir) → `portrait`, el default móvil. */
  orientation: "portrait" | "landscape";
}

const LANDSCAPE_RATIO = 1.15;

export function orientationOf(width: number, height: number): ElementBox["orientation"] {
  return height > 0 && width / height > LANDSCAPE_RATIO ? "landscape" : "portrait";
}

/**
 * Mide el espacio REAL disponible de un elemento (ResizeObserver), en vez de
 * asumirlo por breakpoint del viewport. Es la base del layout "el display decide":
 * el marco de las plantillas de bloque la usa hoy y el video 9:16 / 16:9 la
 * usará para elegir su versión según la orientación del área que ocupa.
 */
export function useElementBox<T extends HTMLElement>(): [React.RefObject<T>, ElementBox] {
  const ref = React.useRef<T>(null);
  const [size, setSize] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (w: number, h: number) =>
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    const rect = el.getBoundingClientRect();
    update(Math.round(rect.width), Math.round(rect.height));
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (cr) update(Math.round(cr.width), Math.round(cr.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, { ...size, orientation: orientationOf(size.width, size.height) }];
}
