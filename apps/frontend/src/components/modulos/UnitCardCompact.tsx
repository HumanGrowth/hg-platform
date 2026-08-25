import { Lock } from "lucide-react";
import Link from "next/link";

import { UnitThumbnail } from "@/components/modulos/UnitThumbnail";
import { Badge } from "@/components/ui/badge";
import { driveToCareerPath, dimensionBadgeVariant, dimensionShortName } from "@/lib/dimension-styles";
import type { LearningUnitFeedItem } from "@/lib/types";
import { unitCanonicalPath } from "@/lib/modulos";
import { cn, formatApproxMinutes } from "@/lib/utils";

export function UnitCardCompact({
  unit,
  assigned = false,
  locked = false,
}: {
  unit: LearningUnitFeedItem;
  assigned?: boolean;
  /** Bloqueado por nivel (colaborador aún no alcanzó este nivel): grayed, no clickeable. */
  locked?: boolean;
}) {
  const completed = unit.attempt_status === "completed";
  const pillar = driveToCareerPath(unit.dimension_code);

  const body = (
    <>
      <div
        className={cn(
          "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-bg-sunken text-fg-subtle",
          locked && "grayscale",
        )}
      >
        {locked ? (
          <Lock size={16} strokeWidth={2} className="text-fg-subtle" aria-hidden />
        ) : (
          <UnitThumbnail posterUrl={unit.poster_url} videoUrl={unit.video_url} completed={completed} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 font-sans text-sm font-semibold text-fg">{unit.title}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {locked && (
            <Badge className="gap-1">
              <Lock size={11} strokeWidth={2} />
              Nivel {unit.level_code.replace(/^L/i, "")}
            </Badge>
          )}
          {!locked && assigned && <Badge variant="info">Asignado por tu manager</Badge>}
          <Badge variant={dimensionBadgeVariant(pillar)}>{dimensionShortName(pillar)}</Badge>
          <span className="text-xs text-fg-muted">
            {formatApproxMinutes(unit.estimated_duration_seconds)} · {unit.blocks_count}{" "}
            {unit.blocks_count === 1 ? "paso" : "pasos"}
          </span>
        </div>
      </div>
    </>
  );

  if (locked) {
    return (
      <div
        aria-disabled
        title="Bloqueado: alcanzá este nivel en Carrera para desbloquearlo."
        className="flex cursor-not-allowed items-center gap-4 rounded-lg border border-border bg-bg-raised p-4 opacity-60"
      >
        {body}
      </div>
    );
  }

  return (
    <Link
      href={unitCanonicalPath(unit)}
      className="group flex items-center gap-4 rounded-lg border border-border bg-bg-raised p-4 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      {body}
    </Link>
  );
}
