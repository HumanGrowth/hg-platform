"use client";

import { ArrowRight, Clock, Flame, Trophy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { FactOfTheDay } from "@/components/home/FactOfTheDay";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { MiniRadar } from "@/components/radar/MiniRadar";
import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { DimensionCard } from "@/components/shared/DimensionCard";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { apiGetHomeDashboard, apiGetMyResults, apiSetOnboardingSeen } from "@/lib/api";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import { useAuthStore } from "@/lib/auth-store";
import { DIMENSIONS } from "@/lib/dimensions";
import { dimensionBadgeVariant, dimensionShortName } from "@/lib/dimension-styles";
import type { HomeDashboard, DimensionResult } from "@/lib/types";
import { cn, greetingName, isFixtureCourse } from "@/lib/utils";

const HomeActivitySection = React.lazy(
  () => import("@/components/widgets/sections/HomeActivitySection"),
);

function WidgetsSkeleton() {
  return (
    <section className="mt-12">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
        <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
      </div>
    </section>
  );
}

const pct = (rate: number) => Math.round(rate * 100);
const dimensionBadge = dimensionBadgeVariant;

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const router = useRouter();
  const firstName = greetingName(user?.full_name ?? "");

  // Tour de onboarding post-primer-login (Release TASK 6).
  const [showTour, setShowTour] = React.useState(false);
  React.useEffect(() => {
    if (user && user.has_seen_onboarding === false) setShowTour(true);
  }, [user]);
  const finishTour = React.useCallback(
    async (action: "finish" | "skip") => {
      setShowTour(false);
      // Optimista: marcamos `has_seen_onboarding` en el store YA. Antes solo se
      // actualizaba con la respuesta del POST; si el POST fallaba o tardaba, el
      // flag quedaba en false y el tour re-disparaba en navegación SPA (bug
      // reportado en beta). El backend persiste igual (best-effort abajo).
      if (user) setUser({ ...user, has_seen_onboarding: true });
      try {
        setUser(await apiSetOnboardingSeen(true));
      } catch {
        /* el flag optimista ya evita el re-trigger de la sesión */
      }
      if (action === "finish") router.push("/modulos/intro" as Route);
    },
    [router, setUser, user],
  );

  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = React.useState<HomeDashboard | null>(null);
  const [results, setResults] = React.useState<DimensionResult[]>([]);

  const loadResults = React.useCallback(async () => {
    try {
      const res = await apiGetMyResults();
      setResults(res.results);
    } catch {
      setResults([]);
    }
  }, []);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [dash] = await Promise.all([apiGetHomeDashboard(), loadResults()]);
      // Ocultar cursos-fixture (seed-w-*, cp-complete) de la actividad reciente.
      setData({
        ...dash,
        recent_activity: dash.recent_activity.filter((a) => !isFixtureCourse(a.course_slug)),
      });
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [loadResults]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const rates = data?.dimension_completion_rates;
  // El radar prioriza los estados reales del assessment; si aún no hay, cae a
  // completion rates (compat pre-assessment).
  const radarValues =
    results.length > 0
      ? radarValuesFromResults(results)
      : rates
        ? Object.fromEntries(Object.entries(rates).map(([k, v]) => [k, pct(v)]))
        : {};

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      {showTour && user && <OnboardingTour userName={firstName} onDone={finishTour} />}
      {/* Hero */}
      <Eyebrow accent>Progreso general</Eyebrow>
      <Display variant="display-2" className="mt-2">
        {firstName ? `Hola, ${firstName}` : "Hola"}
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Acá está tu crecimiento, dimensión por dimensión. Elegí una y seguí.
      </p>
      {/* TASK 3 — copy/tone del hero: placeholder hasta el texto exacto de Andy. */}
      <div className="mt-5">
        <Link href={"/modulos" as Route} className={cn(buttonVariants({ size: "lg" }))}>
          Explorar Módulos
          <ArrowRight size={18} strokeWidth={1.75} />
        </Link>
      </div>

      {/* Fact del día — independiente del dashboard (fetch propio), arriba de todo. */}
      <FactOfTheDay />

      {status === "loading" && (
        <Card className="mt-8 flex items-center justify-center py-16">
          <EmptyRing label="Cargando tu progreso…" />
        </Card>
      )}

      {status === "error" && (
        <Card className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar tu progreso.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {status === "ok" && data && (
        <>
          {/* Placeholder AI (Sprint UI · TASK 11) — arriba de todo. */}
          <AISoonBadge
            variant="card"
            label="Próximamente: tu recomendación diaria"
            dimensionCode={data.next_step?.dimension_code}
            className="mt-8"
          />

          {/* TASK 3 — Cards de dimensión (el hub por dimensión). */}
          <section className="mt-4">
            <Eyebrow>Tus 6 dimensiones</Eyebrow>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {DIMENSIONS.map((d) => (
                <DimensionCard key={d.code} dimension={d} score={radarValues[d.careerPath] ?? 0} />
              ))}
            </div>
          </section>

          {/* Stats — las 3 siempre en una sola fila (col-4 c/u). */}
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
            <Card className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
              <Flame size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
              <div>
                <p className="font-mono text-2xl font-semibold text-fg">{data.stats.streak_days}</p>
                <p className="text-xs text-fg-muted">
                  {data.stats.streak_days === 1 ? "día seguido" : "días seguidos"}
                </p>
              </div>
            </Card>
            <Card className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
              <Clock size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
              <div>
                <p className="font-mono text-2xl font-semibold text-fg">
                  {data.stats.month_watch_minutes}
                </p>
                <p className="text-xs text-fg-muted">min en plataforma</p>
              </div>
            </Card>
            <Card className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left">
              <Trophy size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
              <div>
                <p className="font-mono text-2xl font-semibold text-fg">
                  {data.stats.courses_completed}
                </p>
                <p className="text-xs text-fg-muted">mods completados</p>
              </div>
            </Card>
          </div>

          {/* Mini radar */}
          <Card className="mt-4 flex items-center gap-5 bg-bg-raised">
            <MiniRadar values={radarValues} />
            <div>
              <Eyebrow>Tu radar</Eyebrow>
              <h2 className="mt-1 font-sans text-lg font-semibold text-fg">Vista rápida</h2>
              <Link
                href={"/perfil" as Route}
                className="mt-1 inline-flex items-center gap-1 font-sans text-sm font-semibold text-primary"
              >
                Ver radar completo
                <ArrowRight size={16} strokeWidth={1.75} />
              </Link>
            </div>
          </Card>

          {/* Tu actividad — racha + actividad reciente (lazy-loaded). */}
          <React.Suspense fallback={<WidgetsSkeleton />}>
            <HomeActivitySection recentActivity={data.recent_activity} />
          </React.Suspense>
        </>
      )}

      <p className="mt-10 text-xs text-fg-subtle">
        <Link href={"/perfil" as Route} className="underline underline-offset-2">
          Ver tu perfil y radar completo →
        </Link>
      </p>
    </main>
  );
}
