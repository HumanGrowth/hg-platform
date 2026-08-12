"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { ModuloDetailView } from "@/components/modulos/ModuloDetailView";
import { EmptyRing } from "@/components/EmptyRing";
import { Card } from "@/components/ui/card";
import { apiListModulosByDimension } from "@/lib/api";
import { driveToCareerPath } from "@/lib/dimension-styles";

/**
 * Resuelve la ruta canónica anidada `/modulos/<DIM>/<Ln>/P<n>/<seq>` a la unit
 * concreta y delega en `ModuloDetailView` (TASK 1). Como el detalle se fetchea
 * por slug, traducimos las coordenadas → slug vía el endpoint by-pillar
 * (dimensión→career path). Si no resuelve (unit inexistente o no publicada),
 * manda al índice.
 */
export function ModuloNestedResolver({
  dimension,
  level,
  pillar,
  unit,
}: {
  dimension: string;
  level: string;
  pillar: string;
  unit: string;
}) {
  const router = useRouter();
  const [slug, setSlug] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<"loading" | "not_found">("loading");

  React.useEffect(() => {
    let active = true;
    const pillarNumber = Number.parseInt(pillar.replace(/^P/i, ""), 10);
    const unitNumber = Number.parseInt(unit, 10);
    apiListModulosByDimension(driveToCareerPath(dimension), level, 50)
      .then((units) => {
        if (!active) return;
        const match = units.find(
          (u) => u.pillar_number === pillarNumber && u.unit_number === unitNumber,
        );
        if (match) {
          setSlug(match.slug);
        } else {
          setStatus("not_found");
          router.replace("/modulos");
        }
      })
      .catch(() => {
        if (!active) return;
        setStatus("not_found");
        router.replace("/modulos");
      });
    return () => {
      active = false;
    };
  }, [dimension, level, pillar, unit, router]);

  if (slug) return <ModuloDetailView slug={slug} />;

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      {status === "loading" ? (
        <EmptyRing label="Cargando módulo…" />
      ) : (
        <Card className="px-6 py-12 text-center text-sm text-fg-muted">Redirigiendo al índice…</Card>
      )}
    </div>
  );
}
