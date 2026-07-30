import { notFound } from "next/navigation";

import { DimensionDetail } from "@/components/dimensions/DimensionDetail";
import { dimensionByCode } from "@/lib/dimensions";

// Página de Dimensión (Sprint Tarde · TASK 2) — hub drill-down por dimensión.
// Ruta canónica confirmada con Andy: /dimensiones/[code] (code = CP/PR/RE/SA/PI/ES).
export default function DimensionPage({ params }: { params: { code: string } }) {
  const dimension = dimensionByCode(params.code);
  if (!dimension) notFound();
  return <DimensionDetail dimension={dimension} />;
}
