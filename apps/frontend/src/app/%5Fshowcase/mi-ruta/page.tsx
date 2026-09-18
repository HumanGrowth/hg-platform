"use client";

import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { useSearchParams } from "next/navigation";
import * as React from "react";

import { PathJourney } from "@/components/path/PathJourney";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { backend } from "@/lib/api";
import type { LearningUnitFeedItem, MyPath, PathStep } from "@/lib/types";

/**
 * Showcase de Mi Ruta (/path) con datos de fixture — sin sesión ni backend.
 * Monta el `PathJourney` REAL (con el mismo header que
 * `app/(app)/path/page.tsx`) y le responde al axios `backend` con un adapter de
 * mentira, así se ve exactamente el componente de producción.
 *
 *   /_showcase/mi-ruta?state=full|no-next|no-milestone|assessment&theme=light|dark
 *
 * No está linkeado en la app (carpeta `%5Fshowcase`, igual que `%5Fkit`).
 */

const step = (n: number, o: Partial<PathStep> = {}): PathStep => ({
  unit_id: `u${n}`,
  slug: `unit-${n}`,
  title: "Módulo",
  dimension_code: "CP",
  career_path_code: "P1",
  level_code: "L2",
  pillar_code: "P1",
  estimated_minutes: 8,
  ...o,
});

const NEXT = step(4, { title: "Feedback que impulsa", estimated_minutes: 8 });

const PATH_FULL: MyPath = {
  current_level: "L2",
  next_step: NEXT,
  upcoming: [
    step(5, { title: "Prioriza como estratega", level_code: "L3", estimated_minutes: 10 }),
    step(6, { title: "Decisiones bajo presión", estimated_minutes: 7 }),
    step(7, { title: "Negociar con foco", level_code: "L3", estimated_minutes: 9 }),
  ],
  completed_this_level: 3,
  total_this_level: 12,
  dimensions_progress: [
    { career_path_code: "P1", name: "Carrera e impacto", completed: 3, total: 12 },
    { career_path_code: "P2", name: "Propósito y significado", completed: 0, total: 4 },
  ],
  milestones: [
    {
      kind: "area",
      after_unit_id: "u6",
      title: "Cerrás el área Excelencia operativa",
      dimension_code: "CP",
      career_path_code: "P1",
      pillar_code: "P2",
      level_code: null,
      badge_code: "area-cp-p2",
      badge_name: "Excelencia operativa",
      badge_icon_url: "/icons/badge-placeholder.svg",
      units_remaining: 2,
      requires_assessment: false,
      sequence_position: 2,
    },
    {
      kind: "level",
      after_unit_id: "u7",
      title: "Completás el nivel Sólido",
      dimension_code: "CP",
      career_path_code: "P1",
      pillar_code: null,
      level_code: "L2",
      badge_code: "level-cp-l2",
      badge_name: "Carrera · Sólido",
      badge_icon_url: "/icons/badge-placeholder.svg",
      units_remaining: 9,
      requires_assessment: true,
      sequence_position: 8,
    },
  ],
};

function pathFor(state: string): MyPath {
  switch (state) {
    case "no-next":
      return { ...PATH_FULL, next_step: null, upcoming: [], milestones: [], current_level: null, total_this_level: 0, completed_this_level: 0 };
    case "no-milestone":
      return { ...PATH_FULL, milestones: [] };
    case "assessment":
      return { ...PATH_FULL, milestones: [PATH_FULL.milestones[1]] };
    default:
      return PATH_FULL;
  }
}

const unit = (
  n: number,
  title: string,
  o: Partial<LearningUnitFeedItem> = {},
): LearningUnitFeedItem => ({
  id: `u${n}`,
  slug: `unit-${n}`,
  title,
  dimension_code: "CP",
  pillar_code: "P1",
  unit_number: n,
  level_code: "L2",
  estimated_duration_seconds: 480,
  blocks_count: 7,
  attempt_status: "not_started",
  poster_url: null,
  video_url: null,
  keywords: ["Feedback"],
  ...o,
});

const CP_UNITS: LearningUnitFeedItem[] = [
  unit(1, "Aprender a desaprender", { level_code: "L1", attempt_status: "completed", estimated_duration_seconds: 300, blocks_count: 5 }),
  unit(2, "Colaboración sin fricción", { attempt_status: "completed", estimated_duration_seconds: 360, blocks_count: 6 }),
  unit(3, "Rituales de foco", { pillar_code: "P2", attempt_status: "completed" }),
  unit(4, "Feedback que impulsa", { attempt_status: "in_progress" }),
  unit(5, "Prioriza como estratega", { level_code: "L3", estimated_duration_seconds: 600, blocks_count: 9 }),
  unit(6, "Decisiones bajo presión", { pillar_code: "P2" }),
  unit(7, "Negociar con foco", { level_code: "L3", pillar_code: "P2" }),
];
const PR_UNITS: LearningUnitFeedItem[] = [
  unit(11, "Tu porqué", { dimension_code: "PR", pillar_code: "P1", keywords: ["Propósito"] }),
  unit(12, "Valores en acción", { dimension_code: "PR", pillar_code: "P1", keywords: ["Propósito"] }),
];

function install(state: string) {
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const url = config.url ?? "";
    let data: unknown = [];
    if (url.endsWith("/me/path")) data = pathFor(state);
    else if (url.includes("/modulos/by-dimension")) {
      const dim = (config.params as { dimension_code?: string } | undefined)?.dimension_code;
      const level = (config.params as { level_code?: string } | undefined)?.level_code;
      const all = dim === "P2" ? PR_UNITS : dim === "P1" ? CP_UNITS : [];
      data = level ? all.filter((u) => u.level_code === level) : all;
    }
    return { data, status: 200, statusText: "OK", headers: {}, config };
  };
  backend.defaults.adapter = adapter;
}

function Fixture() {
  const params = useSearchParams();
  const state = params.get("state") ?? "full";
  const theme = params.get("theme");
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    // El tema real sale de la cookie `hg-theme`; acá se fuerza por query para poder capturar ambos.
    if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
    install(state);
    setReady(true);
  }, [state, theme]);
  if (!ready) return null;
  return (
    <div className="mx-auto max-w-app px-6 py-10">
      <Eyebrow className="mb-2">Mi Ruta</Eyebrow>
      <Display className="mb-2 text-4xl">Tu ruta de crecimiento</Display>
      <p className="max-w-prose text-fg-muted">
        Un paso a la vez, en el orden que más te sirve.
      </p>
      <PathJourney />
    </div>
  );
}

export default function MiRutaShowcasePage() {
  return (
    <React.Suspense fallback={null}>
      <Fixture />
    </React.Suspense>
  );
}
