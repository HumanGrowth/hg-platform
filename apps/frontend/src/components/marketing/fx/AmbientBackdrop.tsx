"use client";

import { useEffect, useRef } from "react";

/**
 * Fondo vivo del sitio público, encima del fondo glass de la app:
 *  - 3 blobs de color con parallax al hacer scroll (velocidades distintas),
 *  - un halo suave que sigue al cursor (solo puntero fino).
 * Todo con transforms y sin re-render de React. Reduced motion: estático.
 */
export function AmbientBackdrop() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let y = window.scrollY;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let cx = tx;
    let cy = ty;

    const onScroll = () => {
      y = window.scrollY;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty("--sy", `${y}`);
      el.style.setProperty("--cx", `${cx}px`);
      el.style.setProperty("--cy", `${cy}px`);
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="fx-ambient pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      <div className="fx-blob fx-blob-a" />
      <div className="fx-blob fx-blob-b" />
      <div className="fx-blob fx-blob-c" />
      <div className="fx-cursor-glow" />
    </div>
  );
}
