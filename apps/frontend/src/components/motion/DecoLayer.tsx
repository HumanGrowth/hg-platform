import type { ReactNode } from "react";

/**
 * Capa de decorativos de una sección (motion-07). Sin z-index propio (no crea
 * stacking context): los BrandCircle/BrandLine hijos usan z -1 y quedan sobre
 * la banda del landing-flow (::before, z -1, pintada antes en tree-order) y
 * debajo del contenido. overflow-hidden evita scroll horizontal (Safari iOS).
 */
export function DecoLayer({ children }: { children: ReactNode }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {children}
    </div>
  );
}
