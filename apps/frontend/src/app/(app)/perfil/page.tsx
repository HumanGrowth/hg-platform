"use client";

import { Clock, Flame, Trophy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { BadgesCarousel } from "@/components/perfil/BadgesCarousel";
import { DimensionSummarySection } from "@/components/perfil/DimensionSummarySection";
import {
  GrowthArchetypeCard,
  MilestonesTimeline,
  WeeklyChallengeCard,
} from "@/components/perfil/PerfilInsights";
import { Radar } from "@/components/radar/Radar";
import type { RadarValues } from "@/components/radar/radar-model";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  apiGetHomeDashboard,
  apiGetMyBadges,
  apiGetMyRadar,
  apiGetMyResults,
  apiSetOnboardingSeen,
} from "@/lib/api";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import { useAuthStore } from "@/lib/auth-store";
import { growthArchetype, weeklyChallenge, weekOfYear } from "@/lib/perfil-insights";
import { toast } from "@/lib/toast-store";
import type { DimensionResult, HomeStats, MyBadge, RadarHistory } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  collaborator: "Colaborador/a",
  manager: "Manager",
  admin: "Admin de organización",
  superadmin: "Superadmin HG",
};

export default function PerfilPage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();

  const replayTour = React.useCallback(async () => {
    try {
      setUser(await apiSetOnboardingSeen(false));
      router.push("/home" as Route);
    } catch {
      toast("No pudimos reiniciar el tour.", "danger");
    }
  }, [router, setUser]);

  const [results, setResults] = React.useState<DimensionResult[]>([]);
  const [radarHistory, setRadarHistory] = React.useState<RadarHistory | null>(null);
  const [stats, setStats] = React.useState<HomeStats | null>(null);
  const [badges, setBadges] = React.useState<MyBadge[]>([]);
  const [showPrevious, setShowPrevious] = React.useState(true);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [res, radarHist, dash, myBadges] = await Promise.all([
        apiGetMyResults(),
        apiGetMyRadar().catch(() => null),
        apiGetHomeDashboard().catch(() => null),
        apiGetMyBadges().catch(() => [] as MyBadge[]),
      ]);
      setResults(res.results);
      setRadarHistory(radarHist);
      setStats(dash?.stats ?? null);
      setBadges(myBadges);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const radar = results.length > 0 ? (radarValuesFromResults(results) as RadarValues) : {};
  const previousRadar =
    radarHistory?.previous && radarHistory.previous.length > 0
      ? (radarValuesFromResults(radarHistory.previous) as RadarValues)
      : undefined;
  const archetype = results.length > 0 ? growthArchetype(radar) : null;
  const challenge =
    results.length > 0 ? weeklyChallenge(radar, weekOfYear(new Date())) : null;

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
        <div className="ml-auto flex flex-col items-end gap-2">
          <Link href={"/perfil/editar" as Route}>
            <Button variant="secondary" size="sm">
              Editar mi información
            </Button>
          </Link>
          {/* Consentimiento oculto por ahora (link a Configuración → Privacidad). */}
          <button
            type="button"
            onClick={() => void replayTour()}
            className="font-sans text-xs font-medium text-fg-muted hover:text-fg hover:underline"
          >
            Ver el tour de nuevo
          </button>
        </div>
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
          {/* Resumen de aprendizaje — snapshot de tu recorrido. */}
          {stats && (
            <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
              <Card className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
                <Trophy size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
                <div>
                  <p className="font-mono text-2xl font-semibold text-fg">
                    {stats.courses_completed}
                  </p>
                  <p className="text-xs text-fg-muted">mods completados</p>
                </div>
              </Card>
              <Card className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
                <Clock size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
                <div>
                  <p className="font-mono text-2xl font-semibold text-fg">
                    {stats.month_watch_minutes}
                  </p>
                  <p className="text-xs text-fg-muted">min en plataforma</p>
                </div>
              </Card>
              <Card className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
                <Flame size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
                <div>
                  <p className="font-mono text-2xl font-semibold text-fg">{stats.streak_days}</p>
                  <p className="text-xs text-fg-muted">
                    {stats.streak_days === 1 ? "día seguido" : "días seguidos"}
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Arquetipo de crecimiento — headline derivado de la forma del radar. */}
          {archetype && <GrowthArchetypeCard archetype={archetype} />}

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
                <Radar
                  values={radar}
                  previous={showPrevious ? previousRadar : undefined}
                  state="complete"
                  size="large"
                  interactive
                  animateOnMount
                />
                {previousRadar ? (
                  <label className="mt-3 inline-flex items-center gap-2 text-xs text-fg-muted">
                    <input
                      type="checkbox"
                      checked={showPrevious}
                      onChange={(e) => setShowPrevious(e.target.checked)}
                      className="accent-primary"
                    />
                    Mostrar tu última evaluación
                  </label>
                ) : (
                  <p className="mt-3 text-center text-xs text-fg-subtle">
                    Reevaluá una dimensión para ver tu evolución.
                  </p>
                )}
                <p className="mt-2 text-center text-xs text-fg-subtle">
                  Tocá un vértice para ver esa dimensión.
                </p>
              </Card>
            )}
          </section>

          {/* Logros — carrusel de badges, justo debajo del radar. */}
          <section className="mt-12" id="logros">
            <Eyebrow>Logros</Eyebrow>
            <BadgesCarousel />
          </section>

          {/* Micro-reto semanal — acción concreta para tu dimensión en foco. */}
          {challenge && <WeeklyChallengeCard challenge={challenge} />}

          {/* Progreso por dimensión — card unificada (progreso + estado + reevaluar). */}
          {results.length > 0 && (
            <DimensionSummarySection results={results} radar={radar} onChanged={load} />
          )}

          {/* Tu historia — línea de tiempo de hitos (diagnósticos + insignias). */}
          <MilestonesTimeline results={results} badges={badges} />
        </>
      )}
    </main>
  );
}
