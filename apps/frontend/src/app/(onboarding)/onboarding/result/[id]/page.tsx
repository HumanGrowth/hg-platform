"use client";

import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { Radar } from "@/components/radar/Radar";
import type { RadarValues } from "@/components/radar/radar-model";
import { apiGetMyResults } from "@/lib/api";
import { PILLAR_NAMES, radarValuesFromResults } from "@/lib/assessment-utils";
import type { PillarResult } from "@/lib/types";

export default function OnboardingResult() {
  const [results, setResults] = React.useState<PillarResult[] | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiGetMyResults();
      setResults(res.results);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const radar = results ? (radarValuesFromResults(results) as RadarValues) : {};

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1000px] flex-col items-center px-6 py-16 text-center">
      <div className="eyebrow eyebrow-accent mb-6">Tu punto de partida</div>

      {status === "loading" && (
        <div className="py-20">
          <EmptyRing label="Cargando tus resultados…" />
        </div>
      )}
      {status === "error" && (
        <button
          type="button"
          onClick={() => void load()}
          className="mt-6 rounded-md border border-border-strong px-5 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
        >
          Reintentar
        </button>
      )}

      {status === "ok" && results && (
        <>
          <Radar values={radar} state="complete" size="large" animateOnMount />

          <p className="mt-8 max-w-prose text-hg-charcoal">
            Esto es una <strong>estimación rápida</strong>. Podés profundizar cualquier dimensión
            para confirmar tu estado.
          </p>

          <div className="mt-10 grid w-full grid-cols-1 gap-4 text-left sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <div key={r.pillar_code} className="rounded-xl border border-border bg-surface-card p-5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-fg-subtle">{r.pillar_code}</span>
                  {r.recaida_detected && (
                    <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">
                      ⚠ Recaída
                    </span>
                  )}
                </div>
                <h3 className="mt-1 font-sans text-md font-semibold text-fg">
                  {PILLAR_NAMES[r.pillar_code]}
                </h3>
                <p className="mt-1 font-sans text-sm font-semibold text-primary">
                  {r.state_label}
                </p>
                {r.suggested_next_step && (
                  <p className="mt-2 text-xs text-fg-muted">{r.suggested_next_step}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center gap-3">
            <Link
              href={"/path" as Route}
              className="rounded-md bg-primary px-8 py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Empezar mi ruta →
            </Link>
            <Link
              href={"/home" as Route}
              className="font-sans text-sm font-semibold text-primary"
            >
              Ir a mi inicio
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
