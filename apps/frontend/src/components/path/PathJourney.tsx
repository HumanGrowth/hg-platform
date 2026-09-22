"use client";

import * as React from "react";

import { DimensionCatalog } from "@/components/modulos/DimensionCatalog";
import { PathRoute } from "@/components/path/PathRoute";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetMyPath, apiListModulosByDimension } from "@/lib/api";
import type { LearningUnitFeedItem, MyPath } from "@/lib/types";

export function PathJourney() {
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = React.useState<MyPath | null>(null);
  // Tarjeta completa (thumbnail/poster) del next_step para el header. Se pide
  // por (dimensión, nivel) — la MISMA consulta que usó path_engine para elegir
  // next_step — así el slug SIEMPRE está en la respuesta: nunca cae a un
  // "hero" de otra unit (el desfase que había antes al usar /modulos/feed, que
  // elige su propio hero con lógica independiente).
  const [heroUnit, setHeroUnit] = React.useState<LearningUnitFeedItem | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const path = await apiGetMyPath();
      setData(path);
      const ns = path.next_step;
      setHeroUnit(
        ns
          ? await apiListModulosByDimension(ns.career_path_code, ns.level_code, 50)
              .then((units) => units.find((u) => u.slug === ns.slug) ?? null)
              .catch(() => null)
          : null,
      );
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (status === "loading") {
    return <div className="mt-8 h-40 animate-pulse rounded-xl bg-bg-sunken" />;
  }
  if (status === "error") {
    return (
      <div className="glass-surface-strong mt-8 rounded-lg border border-border bg-bg-raised p-8 text-center">
        <p className="mb-3 font-sans text-sm font-semibold text-fg">No pudimos cargar tu ruta.</p>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-md bg-primary px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover"
        >
          Reintentar
        </button>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="mt-8 flex flex-col gap-12">
      <PathRoute data={data} heroUnit={heroUnit} />

      {/* Explorá por dimensión — el catálogo completo (vivía en Módulos, que
          ahora arranca directo tu siguiente módulo). Es también la puerta para
          repasar un módulo ya visto. */}
      <section aria-labelledby="path-explore-title">
        <Eyebrow>Explorá por dimensión</Eyebrow>
        <Display as="h2" id="path-explore-title" className="mb-2 mt-2 text-4xl">
          Aprendé algo <span className="text-hg-orange">hoy</span>
        </Display>
        <p className="mb-6 max-w-prose text-sm text-fg-muted">
          Todo el contenido, dimensión por dimensión. Entrá a cualquier módulo para verlo o repasarlo.
        </p>
        <DimensionCatalog progressByCareerPath={data.dimensions_progress} />
      </section>
    </div>
  );
}
