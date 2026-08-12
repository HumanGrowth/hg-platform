import { Badge } from "@/components/ui/badge";
import { pillarBadgeVariant, pillarShortName } from "@/lib/pillars";
import type { CourseDetail } from "@/lib/types";
import { formatDuration } from "@/lib/utils";

/** Sidebar derecho del player: metadata real del curso (pilar, competencia,
 * nivel, descripción, duración). */
export function CourseMeta({ course }: { course: CourseDetail }) {
  return (
    <aside className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-bg-raised p-5">
      <div className="flex flex-wrap gap-2">
        {course.pillar_code && (
          <Badge variant={pillarBadgeVariant(course.pillar_code)}>
            {pillarShortName(course.pillar_code)}
          </Badge>
        )}
        {course.competency_code && <Badge>{course.competency_code}</Badge>}
        <Badge>Nivel {course.career_level}</Badge>
      </div>

      <h1 className="font-serif text-lg text-fg">{course.title}</h1>

      {course.description && (
        <p className="text-sm leading-relaxed text-fg-muted">{course.description}</p>
      )}

      <div className="mt-1 text-xs text-fg-muted">
        <span className="uppercase tracking-meta">Duración</span>
        <div className="mt-1 text-sm text-fg">{formatDuration(course.duration_seconds)}</div>
      </div>
    </aside>
  );
}
