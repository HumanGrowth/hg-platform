"use client";

import { Users } from "lucide-react";
import * as React from "react";

import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetMyTeam } from "@/lib/api";
import type { TeamResponse, TeamSort } from "@/lib/types";

const TeamWidgetsSection = React.lazy(
  () => import("@/components/widgets/sections/TeamWidgetsSection"),
);

function TeamWidgetsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
      <div className="h-56 animate-pulse rounded-lg bg-bg-sunken" />
    </div>
  );
}

const PAGE_SIZE = 20;
const SORTS: { value: TeamSort; label: string }[] = [
  { value: "name", label: "Nombre" },
  { value: "last_active", label: "Última actividad" },
  { value: "completion", label: "Completion" },
];

export default function TeamPage() {
  const [page, setPage] = React.useState(1);
  const [sort, setSort] = React.useState<TeamSort>("name");
  const [inactiveOnly, setInactiveOnly] = React.useState(false);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [data, setData] = React.useState<TeamResponse | null>(null);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const res = await apiGetMyTeam({
        page,
        page_size: PAGE_SIZE,
        sort,
        inactive_only: inactiveOnly,
      });
      setData(res);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [page, sort, inactiveOnly]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Mi equipo</Eyebrow>
      <Display variant="display-2" className="mt-2">
        {data ? `${data.total} ${data.total === 1 ? "persona" : "personas"} a tu cargo` : "Mi equipo"}
      </Display>
      {data && (
        <p className="mt-3 text-md text-fg-muted">
          {data.inactive_count > 0 ? (
            <span className="font-semibold text-warning">{data.inactive_count} inactivas</span>
          ) : (
            "Todo el equipo con actividad reciente"
          )}
          {data.inactive_count > 0 && " · revisá quién necesita un empujón"}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Chip active={!inactiveOnly} onClick={() => { setInactiveOnly(false); setPage(1); }}>
          Todos
        </Chip>
        <Chip active={inactiveOnly} onClick={() => { setInactiveOnly(true); setPage(1); }}>
          Solo inactivos
        </Chip>
        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="sort" className="text-xs text-fg-muted">
            Ordenar:
          </label>
          <select
            id="sort"
            value={sort}
            onChange={(e) => { setSort(e.target.value as TeamSort); setPage(1); }}
            className="h-9 rounded-md border border-border bg-bg-raised px-2 text-sm text-fg"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vista de equipo — widgets lazy-loaded (solo si hay reportes) */}
      {status === "ok" && data && data.total > 0 && (
        <div className="mt-6">
          <React.Suspense fallback={<TeamWidgetsSkeleton />}>
            <TeamWidgetsSection />
          </React.Suspense>
        </div>
      )}

      <section className="mt-6">
        {status === "loading" && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-bg-sunken" />
            ))}
          </div>
        )}

        {status === "error" && (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="font-sans text-md font-semibold text-fg">No pudimos cargar tu equipo.</p>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-md bg-orange px-5 py-2 font-sans text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Reintentar
            </button>
          </Card>
        )}

        {status === "ok" && data && data.items.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-16 text-center">
            <Users size={32} strokeWidth={1.75} className="text-fg-subtle" />
            <p className="font-sans text-md font-semibold text-fg">
              {inactiveOnly ? "Nadie inactivo por ahora 🎉" : "Aún no tenés personas a tu cargo."}
            </p>
            {!inactiveOnly && (
              <p className="max-w-sm text-sm text-fg-muted">
                Cuando se te asignen reportes, vas a poder seguirlos desde acá.
              </p>
            )}
          </Card>
        )}

        {status === "ok" && data && data.items.length > 0 && (
          <div className="flex flex-col gap-4">
            {data.items.map((m) => (
              <TeamMemberCard key={m.id} member={m} />
            ))}
          </div>
        )}
      </section>

      {data && data.total > PAGE_SIZE && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-fg disabled:opacity-40"
          >
            ←
          </button>
          <span className="text-sm text-fg-muted">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold text-fg disabled:opacity-40"
          >
            →
          </button>
        </div>
      )}
    </main>
  );
}
