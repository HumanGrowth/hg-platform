"use client";

import { ArrowRight, Clock, Flame, Trophy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { MiniRadar } from "@/components/radar/MiniRadar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { PillarStatesGrid } from "@/components/assessment/PillarStatesGrid";
import { apiGetHomeDashboard, apiGetMyResults } from "@/lib/api";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import { useAuthStore } from "@/lib/auth-store";
import { PILLARS, pillarBadgeVariant, pillarShortName } from "@/lib/pillars";
import type { HomeDashboard, PillarResult } from "@/lib/types";
import { cn, formatRelativeTime, greetingName, isFixtureCourse } from "@/lib/utils";

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
const pillarBadge = pillarBadgeVariant;

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const firstName = greetingName(user?.full_name ?? "");
  const isAdminPlus = user?.role === "admin" || user?.role === "superadmin";

  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = React.useState<HomeDashboard | null>(null);
  const [results, setResults] = React.useState<PillarResult[]>([]);

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

  const rates = data?.pillar_completion_rates;
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
      {/* Hero */}
      <Eyebrow accent>Progreso general</Eyebrow>
      <Display variant="display-2" className="mt-2">
        {firstName ? `Hola, ${firstName}` : "Hola"}
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Acá está tu crecimiento, dimensión por dimensión. Elegí una y seguí.
      </p>

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
          {/* Stats */}
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card className="flex items-center gap-3 bg-bg-raised">
              <Flame size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
              <div>
                <p className="font-mono text-2xl font-semibold text-fg">{data.stats.streak_days}</p>
                <p className="text-xs text-fg-muted">
                  {data.stats.streak_days === 1 ? "día seguido" : "días seguidos"}
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 bg-bg-raised">
              <Clock size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
              <div>
                <p className="font-mono text-2xl font-semibold text-fg">
                  {data.stats.month_watch_minutes}
                </p>
                <p className="text-xs text-fg-muted">min este mes</p>
              </div>
            </Card>
            <Card className="flex items-center gap-3 bg-bg-raised">
              <Trophy size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
              <div>
                <p className="font-mono text-2xl font-semibold text-fg">
                  {data.stats.courses_completed}
                </p>
                <p className="text-xs text-fg-muted">cursos completados</p>
              </div>
            </Card>
          </div>

          {/* Próximo paso */}
          <Card className="mt-4 flex flex-col items-start gap-4 bg-bg-raised sm:flex-row sm:items-center sm:justify-between">
            {data.next_step ? (
              <>
                <div className="min-w-0">
                  <Eyebrow>Tu próximo paso</Eyebrow>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant={pillarBadge(data.next_step.pillar_code)}>
                      {pillarShortName(data.next_step.pillar_code)}
                    </Badge>
                    <h2 className="truncate font-sans text-xl font-semibold text-fg">
                      {data.next_step.course_title}
                    </h2>
                  </div>
                  <div className="mt-3 max-w-xs">
                    <Progress
                      value={Math.round(data.next_step.watch_pct)}
                      label={`Progreso ${data.next_step.course_title}`}
                    />
                  </div>
                </div>
                <Link
                  href={`/library/${data.next_step.course_slug}` as Route}
                  className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
                >
                  Continuar
                  <ArrowRight size={18} strokeWidth={1.75} />
                </Link>
              </>
            ) : (
              <>
                <div>
                  <Eyebrow>Tu próximo paso</Eyebrow>
                  <h2 className="mt-1 font-sans text-xl font-semibold text-fg">
                    Explorá la biblioteca
                  </h2>
                  <p className="mt-1 text-sm text-fg-muted">
                    Todavía no empezaste ningún curso. Elegí una dimensión y arrancá.
                  </p>
                </div>
                <Link
                  href={"/library" as Route}
                  className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
                >
                  Ver biblioteca
                  <ArrowRight size={18} strokeWidth={1.75} />
                </Link>
              </>
            )}
          </Card>

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

          {/* Dimensiones: estados reales del assessment si existen; si no, completion rate. */}
          {results.length > 0 ? (
            <PillarStatesGrid results={results} onChanged={loadResults} />
          ) : (
          <section className="mt-12">
            <Eyebrow>Tus 6 dimensiones</Eyebrow>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {PILLARS.map((p) => {
                const rate = rates?.[p.id] ?? 0;
                return (
                  <Card key={p.id} className="flex flex-col gap-4 bg-cream-50">
                    <div className="flex items-center justify-between">
                      <Badge variant={p.badge}>{p.id}</Badge>
                      <span className={`h-2 w-2 rounded-full ${p.dot}`} aria-hidden />
                    </div>
                    <h3 className="font-sans text-md font-semibold text-fg">{p.name}</h3>
                    <div className="mt-auto">
                      <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
                        <span>Completado</span>
                        <span className="font-mono">{pct(rate)}%</span>
                      </div>
                      <Progress value={pct(rate)} label={`Completado ${p.name}`} />
                    </div>
                    <Link
                      href={"/library" as Route}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "self-start px-0 hover:bg-transparent",
                      )}
                    >
                      Explorar
                      <ArrowRight size={16} strokeWidth={1.75} />
                    </Link>
                  </Card>
                );
              })}
            </div>
          </section>
          )}

          {/* Tu actividad — widgets lazy-loaded (no agregan peso al critical path) */}
          <React.Suspense fallback={<WidgetsSkeleton />}>
            <HomeActivitySection
              enrollments={data.active_enrollments}
              pillarCompletionRates={data.pillar_completion_rates}
            />
          </React.Suspense>

          {/* Actividad reciente */}
          <section className="mt-12">
            <Eyebrow>Actividad reciente</Eyebrow>
            {data.recent_activity.length === 0 ? (
              <Card className="mt-4 flex items-center justify-center py-16">
                <EmptyRing label="Sin actividad aún. Comenzá explorando un pilar." />
              </Card>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {data.recent_activity.map((a) => (
                  <li key={a.course_id}>
                    <Link
                      href={`/library/${a.course_slug}` as Route}
                      className="flex items-center gap-3 rounded-lg border border-border bg-cream-50 px-4 py-3 transition-colors hover:bg-bg-raised"
                    >
                      <Badge variant={pillarBadge(a.pillar_code)}>{pillarShortName(a.pillar_code)}</Badge>
                      <span className="min-w-0 flex-1 truncate font-sans text-sm font-medium text-fg">
                        {a.course_title}
                      </span>
                      {a.is_completed && (
                        <span className="shrink-0 text-xs font-semibold text-success">
                          Completado
                        </span>
                      )}
                      <span className="shrink-0 text-xs text-fg-muted">
                        {formatRelativeTime(a.last_played_at)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <p className="mt-10 text-xs text-fg-subtle">
        {isAdminPlus ? (
          <Link href={"/admin/org" as Route} className="underline underline-offset-2">
            Ir al panel de tu organización →
          </Link>
        ) : (
          <Link href={"/perfil" as Route} className="underline underline-offset-2">
            Ver tu perfil y radar completo →
          </Link>
        )}
      </p>
    </main>
  );
}
