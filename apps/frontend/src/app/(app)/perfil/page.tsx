"use client";

import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { PillarStatesGrid } from "@/components/assessment/PillarStatesGrid";
import { EmptyRing } from "@/components/EmptyRing";
import { Radar } from "@/components/radar/Radar";
import type { RadarValues } from "@/components/radar/radar-model";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetMyResults } from "@/lib/api";
import { canRetake, radarValuesFromResults } from "@/lib/assessment-utils";
import { useAuthStore } from "@/lib/auth-store";
import { PILLAR_FULL_LABEL } from "@/lib/pillars";
import type { AssessmentPillarCode, PillarResult } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  collaborator: "Colaborador/a",
  manager: "Manager",
  admin: "Admin de organización",
  superadmin: "Superadmin HG",
};

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export default function PerfilPage() {
  const user = useAuthStore((s) => s.user);
  const [results, setResults] = React.useState<PillarResult[]>([]);
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

  const radar = results.length > 0 ? (radarValuesFromResults(results) as RadarValues) : {};
  const lastAssessment = results
    .map((r) => r.derived_at)
    .sort()
    .at(-1);

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Avatar name={user?.full_name ?? "?"} size="lg" />
        <div>
          <Eyebrow accent>Mi Perfil</Eyebrow>
          <Display variant="display-2" className="mt-1 text-3xl">
            {user?.full_name ?? "—"}
          </Display>
          <p className="mt-1 text-sm text-fg-muted">
            {ROLE_LABEL[user?.role ?? ""] ?? user?.role}
            {user?.email ? ` · ${user.email}` : ""}
          </p>
        </div>
        <Link href={"/perfil/editar" as Route} className="ml-auto">
          <Button variant="secondary" size="sm">
            Editar mi información
          </Button>
        </Link>
      </div>

      {status === "loading" && (
        <Card className="mt-8 flex items-center justify-center py-16">
          <EmptyRing label="Cargando tu perfil…" />
        </Card>
      )}
      {status === "error" && (
        <Card className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar tu perfil.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {status === "ok" && (
        <>
          {/* Sección 1: Radar */}
          <section className="mt-10" id="mi-radar">
            <Eyebrow>Mi radar</Eyebrow>
            {results.length === 0 ? (
              <Card className="mt-4 flex flex-col items-center gap-3 py-12 text-center">
                <p className="text-sm text-fg-muted">
                  Todavía no tenés una evaluación. Hacé tu diagnóstico para ver tu radar.
                </p>
                <Link href={"/onboarding/welcome" as Route}>
                  <Button>Empezar diagnóstico</Button>
                </Link>
              </Card>
            ) : (
              <Card className="mt-4 flex flex-col items-center bg-bg-raised py-8">
                <Radar values={radar} state="complete" size="large" animateOnMount />
              </Card>
            )}
          </section>

          {/* Sección 2: Mis dimensiones (estado + source + vía + CTA) */}
          {results.length > 0 && <PillarStatesGrid results={results} onChanged={load} />}

          {/* Sección 3: Re-evaluar */}
          {results.length > 0 && (
            <section className="mt-12" id="re-evaluar">
              <Eyebrow>Re-evaluar</Eyebrow>
              <p className="mt-2 text-sm text-fg-muted">
                Confirmá un estimado o volvé a evaluar un pilar (cada 30 días).
              </p>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {results.map((r) => {
                  const ready = r.source === "preliminary" || canRetake(r);
                  const wait = !ready ? daysUntil(r.next_retake_eligible_at) : 0;
                  return (
                    <Card key={r.pillar_code} className="flex items-center justify-between gap-3 bg-cream-50">
                      <div className="min-w-0">
                        <p className="truncate font-sans text-sm font-semibold text-fg">
                          {PILLAR_FULL_LABEL[r.pillar_code as AssessmentPillarCode]}
                        </p>
                        <p className="text-xs text-fg-muted">{r.state_label}</p>
                      </div>
                      {ready ? (
                        <Link href={`/onboarding/detail/${r.pillar_code}` as Route}>
                          <Button variant="secondary" size="sm">
                            {r.source === "preliminary" ? "Evaluar" : "Re-evaluar"}
                          </Button>
                        </Link>
                      ) : (
                        <span
                          className="shrink-0 text-xs text-fg-subtle"
                          title={`Disponible en ${wait} días`}
                        >
                          En {wait} d
                        </span>
                      )}
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* Sección 4: Historial */}
          <section className="mt-12" id="historial">
            <Eyebrow>Historial</Eyebrow>
            {lastAssessment ? (
              <Card className="mt-4 bg-bg-raised">
                <p className="text-sm text-fg">
                  Última evaluación:{" "}
                  <span className="font-semibold">
                    {new Date(lastAssessment).toLocaleDateString("es", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </p>
                <p className="mt-1 text-xs text-fg-muted">
                  Tu evolución por pilar aparecerá acá a medida que vuelvas a evaluarte.
                </p>
              </Card>
            ) : (
              <Card className="mt-4 bg-bg-raised">
                <p className="text-sm text-fg-muted">Sin evaluaciones todavía.</p>
              </Card>
            )}
          </section>

          {/* Sección 5: Logros (placeholder) */}
          <section className="mt-12 mb-4">
            <Eyebrow>Logros</Eyebrow>
            <Card className="mt-4 bg-cream-50">
              <p className="text-sm text-fg-muted">
                Próximamente: badges al completar pilares y rutas.
              </p>
            </Card>
          </section>
        </>
      )}
    </main>
  );
}
