import { Flame, Trophy } from "lucide-react";

import { Avatar } from "@/components/ui/avatar";
import type { TeamPerformer } from "@/lib/types";

/**
 * Ranking de "Actividad del equipo" — ordenado por módulos completados, con
 * días activos (distintos, no racha) como comparativa al lado. Reemplaza el
 * heatmap por persona (TeamActivityHeatmap), que mostraba la misma ventana de
 * 30 días pero sin un orden claro de "quién va mejor".
 */
export function TeamPerformersList({ rows }: { rows: TeamPerformer[] }) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-fg-muted">Sin datos del equipo todavía.</p>;
  }

  const maxCompleted = Math.max(1, ...rows.map((r) => r.courses_completed));

  return (
    <ol className="flex flex-col gap-3">
      {rows.map((r, i) => (
        <li key={r.user_id} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-center font-mono text-xs text-fg-subtle">{i + 1}</span>
          <Avatar name={r.full_name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-sans text-sm font-semibold text-fg">{r.full_name}</p>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(r.courses_completed / maxCompleted) * 100}%` }}
              />
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-fg-muted" title="Módulos completados">
            <Trophy size={13} strokeWidth={1.75} aria-hidden />
            {r.courses_completed}
          </span>
          <span className="flex w-16 shrink-0 items-center gap-1 font-mono text-xs text-fg-muted" title="Días activos (30d)">
            <Flame size={13} strokeWidth={1.75} aria-hidden />
            {r.days_active}d
          </span>
        </li>
      ))}
    </ol>
  );
}
