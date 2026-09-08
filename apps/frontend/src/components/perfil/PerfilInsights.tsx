"use client";

import {
  ArrowRight,
  Award,
  CheckCircle2,
  Flag,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { DIMENSIONS } from "@/lib/dimensions";
import type { GrowthArchetype, WeeklyChallenge } from "@/lib/perfil-insights";
import type { TimelineEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

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

// ─────────────────────────── Tu historia ───────────────────────────

const KIND_ICON: Record<TimelineEvent["kind"], LucideIcon> = {
  diagnostic: Sparkles,
  dimension_started: Flag,
  unit_completed: CheckCircle2,
  badge: Award,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Tu historia": el recorrido completo en horizontal, del primer diagnóstico
 * hasta lo último que hiciste.
 *
 * Horizontal y no vertical porque la lista creció: además de diagnósticos e
 * insignias ahora trae dimensiones empezadas y módulos completados, y en
 * vertical eso empujaba el resto del perfil fuera de la pantalla. Arranca
 * desplazada al final (lo más reciente), que es donde está la persona hoy.
 */
export function StoryTimeline({ events }: { events: TimelineEvent[] }) {
  const scroller = React.useRef<HTMLDivElement>(null);

  // Al montar, mostramos el presente: el scroll arranca en el extremo derecho.
  React.useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [events]);

  if (events.length === 0) return null;

  return (
    <section className="mt-12" id="hitos">
      <Eyebrow>Tu historia</Eyebrow>
      <p className="mt-1 text-sm text-fg-muted">
        Tu recorrido completo, del primer diagnóstico hasta hoy.
      </p>
      <div
        ref={scroller}
        role="list"
        aria-label="Tu historia"
        tabIndex={0}
        className="mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
      >
        {events.map((e, i) => {
          const Icon = KIND_ICON[e.kind];
          const first = i === 0;
          return (
            <article
              key={e.key}
              role="listitem"
              className="flex w-60 shrink-0 snap-start flex-col gap-3"
            >
              {/* Riel horizontal + nodo */}
              <div className="flex items-center gap-2" aria-hidden>
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    first
                      ? "bg-primary text-white"
                      : "border border-border bg-bg-raised text-primary",
                  )}
                >
                  <Icon size={16} strokeWidth={2} />
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <div className="min-w-0">
                <p className="font-sans text-sm font-semibold text-fg">{e.title}</p>
                {e.subtitle && (
                  <p className="mt-0.5 line-clamp-3 text-sm text-fg-muted">{e.subtitle}</p>
                )}
                <p className="mt-1 text-xs text-fg-subtle">{formatDate(e.at)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
