import { Check, Play } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { driveToCareerPath, dimensionBadgeVariant, dimensionShortName } from "@/lib/dimension-styles";
import type { LearningUnitFeedItem } from "@/lib/types";
import { unitCanonicalPath } from "@/lib/modulos";
import { formatApproxMinutes } from "@/lib/utils";

export function UnitCardCompact({
  unit,
  assigned = false,
}: {
  unit: LearningUnitFeedItem;
  assigned?: boolean;
}) {
  const completed = unit.attempt_status === "completed";
  const pillar = driveToCareerPath(unit.dimension_code);
  return (
    <Link
      href={unitCanonicalPath(unit)}
      className="group flex items-center gap-4 rounded-lg border border-border bg-bg-raised p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-sunken text-fg-subtle">
        {unit.poster_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={unit.poster_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <span className="absolute inset-0 bg-black/30" aria-hidden />
            {completed ? (
              <Check size={20} strokeWidth={2} className="relative text-white" />
            ) : (
              <Play size={18} strokeWidth={2} className="relative text-white" />
            )}
          </>
        ) : completed ? (
          <Check size={20} strokeWidth={2} className="text-success" />
        ) : (
          <Play size={18} strokeWidth={1.75} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-sans text-sm font-semibold text-fg">{unit.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {assigned && <Badge variant="info">Asignado por tu manager</Badge>}
          <Badge variant={dimensionBadgeVariant(pillar)}>
            {dimensionShortName(pillar)}
          </Badge>
          <span className="text-xs text-fg-muted">
            {formatApproxMinutes(unit.estimated_duration_seconds)} · {unit.blocks_count}{" "}
            {unit.blocks_count === 1 ? "paso" : "pasos"}
          </span>
        </div>
      </div>
    </Link>
  );
}
