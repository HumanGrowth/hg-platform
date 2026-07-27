import { notFound } from "next/navigation";

import { ModuloDetailView } from "@/components/modulos/ModuloDetailView";
import { ModuloNestedResolver } from "@/components/modulos/ModuloNestedResolver";

/**
 * Ruta de detalle de módulo (TASK 1 · híbrido). Un único catch-all cubre las
 * dos formas de URL (Next no permite dos dynamic segments distintos en el mismo
 * nivel):
 *   - **1 segmento** `/modulos/<slug>` → legacy/backward-compat (links guardados).
 *   - **4 segmentos** `/modulos/<DIM>/<Ln>/P<n>/<seq>` → canónica anidada.
 */
export default function ModuloRoute({ params }: { params: { segments: string[] } }) {
  const segs = params.segments;

  if (segs.length === 1) {
    return <ModuloDetailView slug={segs[0]} />;
  }
  if (segs.length === 4) {
    const [dimension, level, pillar, unit] = segs;
    return <ModuloNestedResolver dimension={dimension} level={level} pillar={pillar} unit={unit} />;
  }
  notFound();
}
