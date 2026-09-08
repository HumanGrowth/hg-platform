"use client";

import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { ModulosLauncher } from "@/components/modulos/ModulosLauncher";
import { dimensionByCareerPath } from "@/lib/dimensions";

/**
 * `/modulos` dejó de ser un catálogo: abre directo el siguiente módulo de tu
 * ruta (o el que dejaste a medias). El catálogo para explorar y repasar vive en
 * Mi Ruta, sección "Explorá por dimensión".
 *
 * `?pillar=` sobrevive solo como redirect: los links viejos apuntaban al
 * catálogo filtrado por dimensión, cuyo equivalente hoy es la página de esa
 * dimensión.
 */
function ModulosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pillar = searchParams.get("pillar");
  const dimension = dimensionByCareerPath(pillar ?? undefined);

  React.useEffect(() => {
    if (!pillar) return;
    router.replace(
      dimension ? (`/dimensiones/${dimension.code}` as Route) : ("/path" as Route),
    );
  }, [pillar, dimension, router]);

  if (pillar) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <EmptyRing label="Llevándote a tu dimensión…" />
      </div>
    );
  }

  return <ModulosLauncher />;
}

export default function ModulosPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <EmptyRing label="Buscando tu próximo módulo…" />
        </div>
      }
    >
      <ModulosPageContent />
    </React.Suspense>
  );
}
