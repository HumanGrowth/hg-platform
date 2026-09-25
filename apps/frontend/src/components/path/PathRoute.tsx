import { ArrowRight, Lock, MessageSquareText } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { HgBadge } from "@/components/badges/HgBadge";
import { UnitThumbnail } from "@/components/modulos/UnitThumbnail";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HexIcon } from "@/components/ui/hex-icon";
import { Progress } from "@/components/ui/progress";
import { levelBadgeMeta } from "@/lib/badge-kit/dimension-adapter";
import { DIMENSIONS_META, subPillarName } from "@/lib/dimension-styles";
import { lockCopy, unitCanonicalPath } from "@/lib/modulos";
import type {
  LearningUnitAttemptStatus,
  LearningUnitFeedItem,
  MyPath,
  PathMilestone,
  PathStep,
  PillarFeedback,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const CTA_LABEL: Record<LearningUnitAttemptStatus, string> = {
  not_started: "Empezar",
  in_progress: "Continuar",
  completed: "Repasar",
};

function dimensionName(code: string): string {
  return DIMENSIONS_META.find((p) => p.id === code)?.name ?? code;
}

function stepHref(s: PathStep): Route {
  return `/modulos/${s.slug}` as Route;
}

/** "Próximo · L2 · 8 min" — sin el tramo de minutos si el paso no lo trae. */
function stepChip(s: PathStep): string {
  return ["Próximo", s.level_code, s.estimated_minutes ? `${s.estimated_minutes} min` : null]
    .filter(Boolean)
    .join(" · ");
}

function stepMeta(s: PathStep): string {
  return [dimensionName(s.career_path_code), s.level_code, s.estimated_minutes ? `${s.estimated_minutes} min` : null]
    .filter(Boolean)
    .join(" · ");
}

function modulesMoreLabel(n: number): string {
  return n === 1 ? "1 módulo más" : `${n} módulos más`;
}

/** Hitos indexados por la unit tras la cual se intercalan. */
function groupMilestones(milestones: PathMilestone[]): Map<string, PathMilestone[]> {
  const map = new Map<string, PathMilestone[]>();
  for (const m of milestones) {
    const bucket = map.get(m.after_unit_id) ?? [];
    bucket.push(m);
    map.set(m.after_unit_id, bucket);
  }
  return map;
}

/** Insignia (bloqueada) de un hito, con el arte del Badge Kit: dimensión + nivel. */
function MilestoneBadge({ milestone, size }: { milestone: PathMilestone; size: number }) {
  const { title, rank } = levelBadgeMeta(milestone.level_code ?? undefined);
  return (
    <HgBadge
      dimension={milestone.career_path_code}
      level={title}
      rank={rank}
      state="locked"
      size={size}
      compact
      className="shrink-0"
    />
  );
}

// ───────────────────────── Panel izquierdo: resumen del nivel ─────────────────────────

/** "Siguiente hito": el primer hito de la ruta — qué insignia viene y cuánto falta. */
function NextMilestoneCard({ milestone }: { milestone: PathMilestone }) {
  return (
    <div className="glass-inset rounded-2xl p-4">
      <Eyebrow>Siguiente hito</Eyebrow>
      <div className="mt-3 flex items-center gap-3">
        <MilestoneBadge milestone={milestone} size={52} />
        <div className="min-w-0">
          <p className="font-heading text-sm font-medium text-fg">{milestone.badge_name}</p>
          {milestone.units_remaining > 0 && (
            <p className="mt-0.5 text-xs text-fg-muted">
              Se desbloquea al terminar {modulesMoreLabel(milestone.units_remaining)}
            </p>
          )}
          {milestone.requires_assessment && (
            <p className="mt-0.5 text-xs text-fg-muted">Requiere evaluación</p>
          )}
        </div>
      </div>
    </div>
  );
}

function LevelSummary({
  data,
  milestone,
}: {
  data: MyPath;
  milestone: PathMilestone | undefined;
}) {
  const { next_step, current_level, completed_this_level: done, total_this_level: total } = data;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const levelLabel = `Nivel ${(current_level ?? "").replace(/^L/i, "")}`;

  // Marcas de hito sobre la barra: en qué % cae cada uno. `sequence_position` es
  // el índice sobre la secuencia COMPLETA del nivel (no solo los ~8 pasos de
  // `upcoming`), así aparece el checkpoint de cada área en curso.
  const markers = (data.milestones ?? []).map((m) => ({
    milestone: m,
    at: Math.min(97, ((done + m.sequence_position + 1) / total) * 100),
  }));

  return (
    <div className="border-b border-border p-6 lg:border-b-0 lg:border-r lg:p-8">
      {/* Sticky en desktop: el resumen acompaña el scroll de la línea larga. */}
      <div className="flex flex-col gap-6 lg:sticky lg:top-6">
        {next_step && (
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hg-cream">
              {/* El nombre de la dimensión va en texto al lado: el ícono es decorativo acá. */}
              <span aria-hidden>
                <HexIcon pillar={next_step.career_path_code} size={28} />
              </span>
            </span>
            <div className="min-w-0">
              <p className="font-heading text-sm font-medium text-fg">
                {dimensionName(next_step.career_path_code)}
              </p>
              {next_step.pillar_code && (
                <p className="text-xs text-fg-muted">
                  {subPillarName(next_step.dimension_code, next_step.pillar_code)}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-end gap-2">
            <span className="font-display text-4xl leading-none text-fg">{done}</span>
            <span className="mb-0.5 text-sm text-fg-muted">
              de {total} {total === 1 ? "módulo" : "módulos"}
            </span>
          </div>
          {/* Barra + marcas de hito (◆). */}
          <div className="relative mt-3 pt-3">
            <Progress
              value={pct}
              label={`${levelLabel}: ${done} de ${total} módulos completados`}
              className="h-2 rounded-full"
              indicatorClassName="rounded-full bg-hg-orange"
            />
            {markers.map(({ milestone: m, at }) => (
              <span
                key={m.badge_code}
                title={`${m.title} · ${m.badge_name}`}
                className="absolute top-0 h-3.5 w-3.5 -translate-x-1/2 rotate-45 rounded-[3px] border-2 border-hg-orange-700 bg-bg"
                style={{ left: `${at}%` }}
                aria-hidden
              />
            ))}
          </div>
          {/* TODO(racha): la reference muestra "· racha de N días"; /me/path no lo trae. */}
          <p className="mt-2 text-xs text-fg-muted">
            {pct}% del {levelLabel.toLowerCase()}
            {markers.length > 0 && (
              <>
                {" "}
                · <span aria-hidden>◆</span> marca dónde ganás una insignia
              </>
            )}
          </p>
        </div>

        {milestone && <NextMilestoneCard milestone={milestone} />}
      </div>
    </div>
  );
}

// ───────────────────────── Panel derecho: línea de la ruta ─────────────────────────

/** Nodo + conector vertical de un ítem de la línea. */
function TimelineItem({
  node,
  last,
  children,
}: {
  node: React.ReactNode;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="motion-safe:animate-fade-in flex gap-4">
      <div className="flex flex-col items-center">
        {node}
        {!last && <span className="my-1 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="mb-4 min-w-0 flex-1">{children}</div>
    </li>
  );
}

/** Card hero del próximo paso: título, chip "Próximo · L2 · 8 min" y CTA. */
function NextStepCard({ step, unit }: { step: PathStep; unit: LearningUnitFeedItem | null }) {
  // Misma resolución que el hero de siempre: la ruta canónica si se resolvió la
  // unit completa; si no, el slug (nunca un "hero" de otra unit).
  const href = unit ? unitCanonicalPath(unit) : stepHref(step);
  const label = unit ? CTA_LABEL[unit.attempt_status] : "Continuar";
  const hasMedia = Boolean(unit?.poster_url || unit?.video_url);

  return (
    <div className="overflow-hidden rounded-2xl border border-hg-amber bg-bg-raised shadow-[var(--glass-glow-amber)]">
      <div
        className="relative flex h-24 items-center justify-center overflow-hidden bg-gradient-to-br from-hg-amber/30 to-hg-orange/15"
        aria-hidden
      >
        {unit && hasMedia ? (
          <UnitThumbnail
            posterUrl={unit.poster_url}
            videoUrl={unit.video_url}
            completed={unit.attempt_status === "completed"}
            iconSize={28}
          />
        ) : (
          <span className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-hg-cream/80">
            <HexIcon pillar={step.career_path_code} size={44} />
          </span>
        )}
      </div>
      <div className="p-5">
        <span className="inline-block rounded-full bg-hg-amber/20 px-2.5 py-0.5 font-sans text-micro font-semibold uppercase tracking-meta text-fg">
          {stepChip(step)}
        </span>
        <h3 className="mt-3 font-heading text-lg font-medium text-fg">{step.title}</h3>
        <p className="mt-1 text-sm text-fg-muted">
          {dimensionName(step.career_path_code)}
          {unit ? ` · ${unit.blocks_count} ${unit.blocks_count === 1 ? "paso" : "pasos"}` : ""}
        </p>
        {/* TODO(progreso del módulo): "paso 4 de 7" + barra — /me/path no expone el avance dentro del módulo. */}
        <Link
          href={href}
          aria-label={`${label}: ${step.title}`}
          className={cn(buttonVariants({ size: "lg" }), "mt-4")}
        >
          {label}
          <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function UpcomingStep({ step }: { step: PathStep }) {
  if (step.locked) {
    const lock = lockCopy(step.lock_reason, step.level_code);
    return (
      <div
        aria-disabled
        title={lock.hint}
        className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-dashed border-border px-4 py-3 opacity-60"
      >
        <span className="min-w-0">
          <span className="line-clamp-1 block font-heading text-sm font-medium text-fg">{step.title}</span>
          <span className="mt-0.5 block text-xs text-fg-muted">{stepMeta(step)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
          <Lock size={12} strokeWidth={2} aria-hidden />
          {lock.hint}
        </span>
      </div>
    );
  }
  return (
    <Link
      href={stepHref(step)}
      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-2xl border border-dashed border-border-strong px-4 py-3 transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      <span className="min-w-0">
        <span className="line-clamp-1 block font-heading text-sm font-medium text-fg">{step.title}</span>
        <span className="mt-0.5 block text-xs text-fg-muted">{stepMeta(step)}</span>
      </span>
      <span className="font-heading text-sm font-medium text-primary">Empezar</span>
    </Link>
  );
}

/** Un hito intercalado en la línea: la insignia que ganás al llegar a ese punto. */
function MilestoneRow({ milestone }: { milestone: PathMilestone }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary/[0.04] px-4 py-3">
      <MilestoneBadge milestone={milestone} size={40} />
      <div className="min-w-0">
        <p className="font-heading text-sm font-medium text-fg">{milestone.title}</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          A {modulesMoreLabel(milestone.units_remaining)} desbloqueás la insignia{" "}
          <span className="font-semibold text-fg">{milestone.badge_name}</span>
          {milestone.requires_assessment
            ? ". Esta insignia también toma en cuenta tu evaluación de la dimensión."
            : "."}
        </p>
      </div>
    </div>
  );
}

/** "Feedback que impulsa" de un pilar: el texto que dejó tu manager. Es
 * informativo — nunca bloquea el avance (eso lo decide `manager_approved`). */
function PillarFeedbackCard({
  feedback,
  pillarName,
}: {
  feedback: PillarFeedback | undefined;
  pillarName?: string;
}) {
  return (
    <section
      aria-label={`Feedback que impulsa${pillarName ? ` · ${pillarName}` : ""}`}
      className="glass-inset mt-2 flex items-start gap-4 rounded-2xl p-4"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bg-sunken text-fg-muted">
        <MessageSquareText size={20} strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0">
        <h3 className="font-heading text-sm font-medium text-fg">Feedback que impulsa</h3>
        {pillarName && <p className="text-xs text-fg-subtle">{pillarName}</p>}
        {feedback ? (
          <>
            <p className="mt-1 whitespace-pre-line text-sm text-fg">{feedback.text}</p>
            {feedback.manager_name && (
              <p className="mt-1.5 text-xs text-fg-muted">— {feedback.manager_name}</p>
            )}
          </>
        ) : (
          <p className="mt-0.5 text-xs text-fg-muted">
            Tu manager te va a dejar su feedback sobre este pilar. Lo vas a ver acá.
          </p>
        )}
      </div>
    </section>
  );
}

function feedbackKey(dimensionCode: string, pillarCode: string | null): string {
  return `${dimensionCode}:${pillarCode ?? ""}`;
}

function RouteTimeline({
  data,
  heroUnit,
  pillarFeedback,
}: {
  data: MyPath;
  heroUnit: LearningUnitFeedItem | null;
  pillarFeedback: PillarFeedback[];
}) {
  const { next_step, upcoming } = data;
  const milestonesAfter = groupMilestones(data.milestones ?? []);
  const feedbackByPillar = new Map(
    pillarFeedback.map((f) => [feedbackKey(f.dimension_code, f.pillar_code), f]),
  );
  // Feedback de pilares que ya no tienen un hito de área pendiente (pilares
  // terminados): no tienen dónde colgarse en la línea, van al final.
  const anchored = new Set(
    (data.milestones ?? [])
      .filter((m) => m.kind === "area")
      .map((m) => feedbackKey(m.dimension_code, m.pillar_code)),
  );
  const pastFeedback = pillarFeedback.filter(
    (f) => !anchored.has(feedbackKey(f.dimension_code, f.pillar_code)),
  );

  return (
    <div className="p-6 lg:p-8">
      {next_step ? (
        <ol className="flex flex-col">
          <TimelineItem
            last={upcoming.length === 0}
            node={
              <span
                className="mt-6 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hg-amber ring-[6px] ring-hg-amber/20"
                aria-hidden
              >
                <span className="h-2 w-2 rounded-full bg-white" />
              </span>
            }
          >
            <NextStepCard step={next_step} unit={heroUnit} />
          </TimelineItem>

          {upcoming.map((s, i) => {
            const reached = milestonesAfter.get(s.unit_id) ?? [];
            const isLastStep = i === upcoming.length - 1;
            return (
              <React.Fragment key={s.unit_id}>
                <TimelineItem
                  last={isLastStep && reached.length === 0}
                  node={
                    <span
                      className="bg-bg-raised inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-strong text-fg-muted"
                      aria-hidden
                    >
                      <ArrowRight size={13} strokeWidth={2} />
                    </span>
                  }
                >
                  <UpcomingStep step={s} />
                </TimelineItem>
                {reached.map((m, j) => (
                  <TimelineItem
                    key={m.badge_code}
                    last={isLastStep && j === reached.length - 1}
                    node={
                      <span
                        className="mt-4 h-3 w-3 shrink-0 rotate-45 rounded-sm border-2 border-primary bg-bg"
                        aria-hidden
                      />
                    }
                  >
                    <MilestoneRow milestone={m} />
                    {m.kind === "area" && (
                      <PillarFeedbackCard
                        feedback={feedbackByPillar.get(feedbackKey(m.dimension_code, m.pillar_code))}
                        pillarName={m.pillar_code ? subPillarName(m.dimension_code, m.pillar_code) : undefined}
                      />
                    )}
                  </TimelineItem>
                ))}
              </React.Fragment>
            );
          })}
        </ol>
      ) : (
        <div className="rounded-2xl border border-dashed border-border-strong p-8 text-center">
          <p className="font-heading text-base font-medium text-fg">¡Completaste todo lo disponible!</p>
          <p className="mt-1 text-sm text-fg-muted">Estamos preparando nuevos módulos para tu ruta.</p>
        </div>
      )}
      {pastFeedback.map((f) => (
        <PillarFeedbackCard
          key={feedbackKey(f.dimension_code, f.pillar_code)}
          feedback={f}
          pillarName={subPillarName(f.dimension_code, f.pillar_code)}
        />
      ))}
    </div>
  );
}

/**
 * "Tu ruta": resumen del nivel + siguiente hito (izquierda) y la línea de la ruta
 * con el hero del próximo paso (derecha). Solo presentación de `GET /me/path`.
 * Sin datos de nivel (`current_level`/`total_this_level`) el panel izquierdo se
 * omite y la línea ocupa todo el ancho.
 */
export function PathRoute({
  data,
  heroUnit,
  pillarFeedback = [],
}: {
  data: MyPath;
  heroUnit: LearningUnitFeedItem | null;
  /** Feedback del manager por pilar (`GET /me/pillar-feedback`). */
  pillarFeedback?: PillarFeedback[];
}) {
  const hasLevel = Boolean(data.current_level) && data.total_this_level > 0;

  return (
    <section aria-labelledby="path-route-title">
      <Eyebrow as="h2" id="path-route-title">
        Tu ruta
      </Eyebrow>
      <div
        className={cn(
          "glass-surface-strong mt-2.5 grid",
          hasLevel && "lg:grid-cols-[20rem_minmax(0,1fr)]",
        )}
      >
        {hasLevel && <LevelSummary data={data} milestone={data.milestones?.[0]} />}
        <RouteTimeline data={data} heroUnit={heroUnit} pillarFeedback={pillarFeedback} />
      </div>
    </section>
  );
}
