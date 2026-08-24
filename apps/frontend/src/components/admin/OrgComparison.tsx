import type { OrgBreakdown } from "@/lib/types";

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-bg-sunken">
      <div className={`h-full rounded-full ${tone}`} style={{ width: pct(value) }} />
    </div>
  );
}

/**
 * Comparativa por organización (empresa con varias orgs): adopción y completion
 * lado a lado + inactivos, para ver de un vistazo qué org va mejor/peor.
 */
export function OrgComparison({ orgs }: { orgs: OrgBreakdown[] }) {
  if (orgs.length === 0) return null;
  // Referencia para resaltar: la de mejor adopción.
  const bestAdoption = Math.max(...orgs.map((o) => o.adoption_rate));

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-bg-raised">
      <table className="w-full min-w-[36rem] text-left">
        <thead className="border-b border-border">
          <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
            <th className="px-5 py-3 font-semibold">Organización</th>
            <th className="px-5 py-3 font-semibold">Adopción</th>
            <th className="px-5 py-3 font-semibold">Completion</th>
            <th className="px-5 py-3 text-right font-semibold">Inactivos</th>
          </tr>
        </thead>
        <tbody>
          {orgs.map((o) => {
            const isBest = o.adoption_rate === bestAdoption && bestAdoption > 0;
            return (
              <tr key={o.org_id} className="border-b border-border last:border-0">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-sans text-sm font-semibold text-fg">{o.org_name}</span>
                    {isBest && (
                      <span className="rounded-full bg-hg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                        líder
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-fg-muted">
                    {o.active_users}/{o.total_users} activos
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Bar value={o.adoption_rate} tone="bg-primary" />
                    <span className="w-9 shrink-0 text-right font-mono text-xs text-fg-muted">
                      {pct(o.adoption_rate)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <Bar value={o.completion_rate} tone="bg-hg-amber" />
                    <span className="w-9 shrink-0 text-right font-mono text-xs text-fg-muted">
                      {pct(o.completion_rate)}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-3 text-right">
                  <span
                    className={
                      o.inactive_users > 0
                        ? "rounded-full bg-danger-bg px-2 py-0.5 font-mono text-xs font-semibold text-danger"
                        : "font-mono text-xs text-fg-muted"
                    }
                  >
                    {o.inactive_users}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
