import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HexIcon } from "@/components/ui/hex-icon";
import { PILLARS, pillarBadgeVariant, pillarBaseCode, pillarShortName } from "@/lib/pillars";
import type { LearningUnitFeedItem } from "@/lib/types";
import { cn, formatApproxMinutes } from "@/lib/utils";

const CTA_LABEL: Record<LearningUnitFeedItem["attempt_status"], string> = {
  not_started: "Empezar",
  in_progress: "Continuar",
  completed: "Repasar",
};

export function UnitCardHero({ unit }: { unit: LearningUnitFeedItem }) {
  const pillarDot = PILLARS.find((p) => p.id === pillarBaseCode(unit.pillar_code))?.dot;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
      <div className={cn("h-1.5 w-full", pillarDot ?? "bg-bg-sunken")} aria-hidden />
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <Eyebrow accent>Tu módulo de hoy</Eyebrow>
          <h2 className="mt-2 line-clamp-2 font-sans text-xl font-semibold text-fg sm:text-2xl">
            {unit.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={pillarBadgeVariant(unit.pillar_code)}>
              {pillarShortName(unit.pillar_code)}
            </Badge>
            <Badge>{unit.level_code}</Badge>
            <span className="text-xs text-fg-muted">
              {formatApproxMinutes(unit.estimated_duration_seconds)} · {unit.blocks_count}{" "}
              {unit.blocks_count === 1 ? "paso" : "pasos"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <HexIcon pillar={unit.pillar_code} size={56} className="hidden sm:block" />
          <Link
            href={`/modulos/${unit.slug}` as Route}
            className={cn(buttonVariants({ size: "lg" }), "shrink-0")}
          >
            {CTA_LABEL[unit.attempt_status]}
            <ArrowRight size={18} strokeWidth={1.75} />
          </Link>
        </div>
      </div>
    </div>
  );
}
