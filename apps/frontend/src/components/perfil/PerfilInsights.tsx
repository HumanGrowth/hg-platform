"use client";

import { ArrowRight, Award, Sparkles, Target } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { dimensionShortName } from "@/lib/dimension-styles";
import { DIMENSIONS } from "@/lib/dimensions";
import type { GrowthArchetype, WeeklyChallenge } from "@/lib/perfil-insights";
import type { DimensionResult, MyBadge } from "@/lib/types";

// ─────────────────────────── Arquetipo ───────────────────────────

export function GrowthArchetypeCard({ archetype }: { archetype: GrowthArchetype }) {
  return (
    <Card className="mt-8 flex items-start gap-4 bg-bg-raised">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hg-green-100 text-primary">
        <Sparkles size={22} strokeWidth={1.75} aria-hidden />
      </div>
      <div className="min-w-0">
        <Eyebrow accent>Tu arquetipo de crecimiento</Eyebrow>
        <h2 className="mt-1 font-sans text-xl font-semibold text-fg">{archetype.title}</h2>
        <p className="mt-1 text-sm text-fg-muted">{archetype.description}</p>
      </div>
    </Card>
  );
}

// ─────────────────────────── Micro-reto semanal ───────────────────────────

export function WeeklyChallengeCard({ challenge }: { challenge: WeeklyChallenge }) {
  // La dimensión en foco usa código careerPath (P1..P6); el detalle de dimensión
  // se rutea por el code Drive (CP…). Resolvemos vía el registro DIMENSIONS.
  const driveCode = DIMENSIONS.find((d) => d.careerPath === challenge.focusCode)?.code ?? null;
  return (
    <Card className="mt-8 flex flex-col gap-3 bg-bg-raised">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hg-green-100 text-primary">
          <Target size={22} strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <Eyebrow accent>Tu reto de la semana</Eyebrow>
          <p className="mt-0.5 text-xs text-fg-muted">
            En foco: <span className="font-semibold text-fg">{challenge.focusName}</span> — tu
            dimensión con más recorrido por delante.
          </p>
        </div>
      </div>
      <p className="font-sans text-md font-medium text-fg">{challenge.text}</p>
      {driveCode && (
        <Link
          href={`/dimensiones/${driveCode}` as Route}
          className="inline-flex items-center gap-1 self-start font-sans text-sm font-semibold text-primary hover:underline"
        >
          Ver {challenge.focusName}
          <ArrowRight size={16} strokeWidth={1.75} />
        </Link>
      )}
    </Card>
  );
}

// ─────────────────────────── Línea de tiempo de hitos ───────────────────────────

interface Milestone {
  key: string;
  date: string; // ISO
  title: string;
  subtitle?: string;
  kind: "diagnostic" | "badge";
  first?: boolean;
}

function buildMilestones(results: DimensionResult[], badges: MyBadge[]): Milestone[] {
  const items: Milestone[] = [];

  // Evaluaciones por dimensión (la más antigua = "primer diagnóstico").
  const sortedResults = [...results].sort((a, b) => a.derived_at.localeCompare(b.derived_at));
  sortedResults.forEach((r, i) => {
    items.push({
      key: `res-${r.dimension_code}`,
      date: r.derived_at,
      title: i === 0 ? "Tu primer diagnóstico" : `Evaluaste ${dimensionShortName(r.dimension_code)}`,
      subtitle: i === 0 ? "Arrancaste tu recorrido en HumanGrowth." : r.state_label,
      kind: "diagnostic",
      first: i === 0,
    });
  });

  // Insignias desbloqueadas.
  for (const b of badges) {
    if (b.unlocked && b.unlocked_at) {
      items.push({
        key: `badge-${b.code}`,
        date: b.unlocked_at,
        title: `Desbloqueaste "${b.name}"`,
        subtitle: b.description,
        kind: "badge",
      });
    }
  }

  // Más reciente primero.
  return items.sort((a, b) => b.date.localeCompare(a.date));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

export function MilestonesTimeline({
  results,
  badges,
}: {
  results: DimensionResult[];
  badges: MyBadge[];
}) {
  const milestones = React.useMemo(() => buildMilestones(results, badges), [results, badges]);
  if (milestones.length === 0) return null;

  return (
    <section className="mt-12" id="hitos">
      <Eyebrow>Tu historia</Eyebrow>
      <ol className="mt-4 flex flex-col">
        {milestones.map((m, i) => {
          const last = i === milestones.length - 1;
          const Icon = m.kind === "badge" ? Award : Sparkles;
          return (
            <li key={m.key} className="flex gap-4">
              {/* Riel + nodo */}
              <div className="flex flex-col items-center">
                <span
                  className={
                    m.first
                      ? "flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white"
                      : "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-raised text-primary"
                  }
                >
                  <Icon size={16} strokeWidth={2} aria-hidden />
                </span>
                {!last && <span className="w-px flex-1 bg-border" aria-hidden />}
              </div>
              {/* Contenido */}
              <div className={last ? "pb-0" : "pb-6"}>
                <p className="font-sans text-sm font-semibold text-fg">{m.title}</p>
                {m.subtitle && <p className="mt-0.5 text-sm text-fg-muted">{m.subtitle}</p>}
                <p className="mt-0.5 text-xs text-fg-subtle">{formatDate(m.date)}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
