import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { HexIcon } from "@/components/ui/hex-icon";
import { DIMENSIONS_META, driveToCareerPath, dimensionBadgeVariant, dimensionShortName } from "@/lib/dimension-styles";
import type { LearningUnitFeedItem } from "@/lib/types";
import { unitCanonicalPath } from "@/lib/modulos";
import { cn, formatApproxMinutes } from "@/lib/utils";

const CTA_LABEL: Record<LearningUnitFeedItem["attempt_status"], string> = {
  not_started: "Empezar",
  in_progress: "Continuar",
  completed: "Repasar",
};

export function UnitCardHero({ unit }: { unit: LearningUnitFeedItem }) {
  // La unit guarda la dimensión Drive (CP…); el DS colorea por dimensión → resolvemos.
  const pillar = driveToCareerPath(unit.dimension_code);
  const dimensionDot = DIMENSIONS_META.find((p) => p.id === pillar)?.dot;
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-bg-raised">
      {unit.poster_url ? (
        <div className="relative aspect-video w-full overflow-hidden bg-bg-sunken">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unit.poster_url} alt="" className="h-full w-full object-cover" />
          <div className={cn("absolute inset-x-0 top-0 h-1.5", dimensionDot ?? "bg-bg-sunken")} aria-hidden />
        </div>
      ) : (
        <div className={cn("h-1.5 w-full", dimensionDot ?? "bg-bg-sunken")} aria-hidden />
      )}
      <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <Eyebrow accent>Tu módulo de hoy</Eyebrow>
          <h2 className="mt-2 line-clamp-2 font-sans text-xl font-semibold text-fg sm:text-2xl">
            {unit.title}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant={dimensionBadgeVariant(pillar)}>
              {dimensionShortName(pillar)}
            </Badge>
            <Badge>{unit.level_code}</Badge>
            <span className="text-xs text-fg-muted">
              {formatApproxMinutes(unit.estimated_duration_seconds)} · {unit.blocks_count}{" "}
              {unit.blocks_count === 1 ? "paso" : "pasos"}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <HexIcon pillar={pillar} size={56} className="hidden sm:block" />
          <Link
            href={unitCanonicalPath(unit)}
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
