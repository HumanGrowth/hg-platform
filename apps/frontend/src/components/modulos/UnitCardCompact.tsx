import { Check, Play } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { dimensionToPillar, pillarBadgeVariant, pillarShortName } from "@/lib/pillars";
import type { LearningUnitFeedItem } from "@/lib/types";
import { unitCanonicalPath } from "@/lib/modulos";
import { formatApproxMinutes } from "@/lib/utils";

export function UnitCardCompact({ unit }: { unit: LearningUnitFeedItem }) {
  const completed = unit.attempt_status === "completed";
  const pillar = dimensionToPillar(unit.dimension_code);
  return (
    <Link
      href={unitCanonicalPath(unit)}
      className="group flex items-center gap-4 rounded-lg border border-border bg-bg-raised p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-bg-sunken text-fg-subtle">
        {completed ? (
          <Check size={20} strokeWidth={2} className="text-success" />
        ) : (
          <Play size={18} strokeWidth={1.75} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-sans text-sm font-semibold text-fg">{unit.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={pillarBadgeVariant(pillar)}>
            {pillarShortName(pillar)}
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
