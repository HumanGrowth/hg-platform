import * as React from "react";

import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { DIMENSION_SHORT_LABEL, dimensionShortName } from "@/lib/dimension-styles";
import type {
  AssessmentOverview,
  AccountProgress,
  AssignmentCompliance,
  AssignmentOrgCompliance,
  LicenseOrgUsage,
  ManagerEngagement,
  ManagerEngagementRow,
} from "@/lib/types";

import { WidgetSrTable } from "./WidgetSrTable";

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 100)}%` : "—";
}

/** Barra horizontal simple (valor / máximo). Siempre acompañada de su número. */
function MeterBar({ value, max, tone }: { value: number; max: number; tone: string }) {
  return (
    <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken" aria-hidden>
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: max > 0 ? `${Math.min(100, (value / max) * 100)}%` : "0%" }}
      />
    </div>
  );
}

// ─────────────────────────── Cumplimiento de asignaciones ───────────────────────────

const ASSIGNMENT_SEGMENTS: {
  key: keyof Pick<AssignmentOrgCompliance, "completed" | "open" | "due_soon" | "overdue">;
  label: string;
  tone: string;
}[] = [
  { key: "completed", label: "Cumplidas", tone: "bg-tone-done" },
  { key: "open", label: "En curso", tone: "bg-tone-open" },
  { key: "due_soon", label: "Vencen en ≤7 días", tone: "bg-tone-warn" },
  { key: "overdue", label: "Vencidas", tone: "bg-tone-late" },
];

const ALL_ORGS = "all";

export function AssignmentComplianceWidget({ data }: { data: AssignmentCompliance }) {
  const [selected, setSelected] = React.useState<string>(ALL_ORGS);

  if (data.total === 0) {
    return (
      <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-fg-muted">
        Todavía no hay módulos asignados. Cuando asignes contenido verás aquí si se cumple a tiempo.
      </p>
    );
  }

  const showChips = data.by_org.length > 1;
  const org = showChips ? data.by_org.find((o) => o.org_id === selected) : undefined;
  const view: AssignmentOrgCompliance = org ?? {
    org_id: ALL_ORGS,
    org_name: "Todas",
    total: data.total,
    completed: data.completed,
    overdue: data.overdue,
    due_soon: data.due_soon,
    open: data.open,
  };

  return (
    <div>
      {showChips && (
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrar por organización">
          <OrgChip
            label="Todas"
            sub={`${data.completed}/${data.total} · ${pct(data.completed, data.total)}`}
            overdue={data.overdue}
            active={selected === ALL_ORGS}
            onClick={() => setSelected(ALL_ORGS)}
          />
          {data.by_org.map((o) => (
            <OrgChip
              key={o.org_id}
              label={o.org_name}
              sub={o.total > 0 ? `${o.completed}/${o.total} · ${pct(o.completed, o.total)}` : "Sin asignaciones"}
              overdue={o.overdue}
              active={selected === o.org_id}
              onClick={() => setSelected(o.org_id)}
            />
          ))}
        </div>
      )}

      {view.total === 0 ? (
        <p className="py-6 text-center text-sm text-fg-muted">
          {view.org_name} no tiene módulos asignados.
        </p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-sunken" aria-hidden>
            {ASSIGNMENT_SEGMENTS.map((seg) => (
              <div
                key={seg.key}
                className={seg.tone}
                style={{ width: `${(view[seg.key] / view.total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ASSIGNMENT_SEGMENTS.map((seg) => (
              <li key={seg.key} className="flex items-center gap-2 text-sm">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${seg.tone}`} aria-hidden />
                <span className="flex-1 text-fg-muted">{seg.label}</span>
                <span className="font-mono text-xs text-fg">
                  {view[seg.key]} · {pct(view[seg.key], view.total)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {!showChips && data.users_with_overdue > 0 && (
        <p className="mt-3 text-xs text-danger">
          {data.users_with_overdue}{" "}
          {data.users_with_overdue === 1 ? "persona tiene" : "personas tienen"} asignaciones
          vencidas.
        </p>
      )}
    </div>
  );
}

function OrgChip({
  label,
  sub,
  overdue,
  active,
  onClick,
}: {
  label: string;
  sub: string;
  overdue: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`flex flex-col items-start rounded-lg border px-3 py-1.5 text-left transition-colors ${
        active
          ? "border-tone-sel-border bg-tone-sel-bg text-fg"
          : "border-border bg-bg-raised text-fg-muted hover:bg-bg-sunken"
      }`}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        {label}
        {overdue > 0 && (
          <span className="rounded-full bg-tone-late-bg px-1.5 py-0.5 font-mono text-[10px] font-semibold text-tone-late-fg">
            {overdue} {overdue === 1 ? "vencida" : "vencidas"}
          </span>
        )}
      </span>
      <span className="font-mono text-xs">{sub}</span>
    </button>
  );
}

// ─────────────────────────── Progreso de cuentas ───────────────────────────

const ACCOUNTS_PAGE_SIZE = 10;
const ALL = "all";
const NO_MANAGER = "none";

/** Minúsculas y sin tildes, para que "jose" encuentre "José". */
function normalize(v: string): string {
  return v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function formatLogin(iso: string | null): string {
  if (!iso) return "Nunca";
  return new Date(iso).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
}

export function AccountProgressTable({ accounts }: { accounts: AccountProgress[] }) {
  const [query, setQuery] = React.useState("");
  const [org, setOrg] = React.useState(ALL);
  const [manager, setManager] = React.useState(ALL);
  const [page, setPage] = React.useState(0);

  const orgs = React.useMemo(() => {
    const m = new Map<string, string>();
    accounts.forEach((a) => m.set(a.org_id, a.org_name));
    return [...m].sort((x, y) => x[1].localeCompare(y[1]));
  }, [accounts]);

  // Los managers ofrecidos dependen de la organización elegida.
  const managers = React.useMemo(() => {
    const m = new Map<string, string>();
    accounts
      .filter((a) => org === ALL || a.org_id === org)
      .forEach((a) => a.manager_id && m.set(a.manager_id, a.manager_name ?? "—"));
    return [...m].sort((x, y) => x[1].localeCompare(y[1]));
  }, [accounts, org]);
  const hasUnmanaged = accounts.some((a) => !a.manager_id && (org === ALL || a.org_id === org));

  const filtered = React.useMemo(() => {
    const q = normalize(query.trim());
    return accounts.filter(
      (a) =>
        (org === ALL || a.org_id === org) &&
        (manager === ALL || (manager === NO_MANAGER ? !a.manager_id : a.manager_id === manager)) &&
        (q === "" || normalize(a.full_name).includes(q) || normalize(a.email).includes(q)),
    );
  }, [accounts, org, manager, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / ACCOUNTS_PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * ACCOUNTS_PAGE_SIZE, (current + 1) * ACCOUNTS_PAGE_SIZE);
  const filtering = query !== "" || org !== ALL || manager !== ALL;

  function reset() {
    setQuery("");
    setOrg(ALL);
    setManager(ALL);
    setPage(0);
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Input
          type="search"
          placeholder="Buscar por nombre o correo"
          aria-label="Buscar usuario"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="md:col-span-2"
        />
        <Select
          aria-label="Filtrar por organización"
          value={org}
          onChange={(e) => {
            setOrg(e.target.value);
            setManager(ALL);
            setPage(0);
          }}
        >
          <option value={ALL}>Todas las organizaciones</option>
          {orgs.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filtrar por manager"
          value={manager}
          onChange={(e) => {
            setManager(e.target.value);
            setPage(0);
          }}
        >
          <option value={ALL}>Todos los managers</option>
          {managers.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
          {hasUnmanaged && <option value={NO_MANAGER}>Sin manager</option>}
        </Select>
      </div>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-fg-muted">
          {accounts.length === 0
            ? "Todavía no hay cuentas en este alcance."
            : "Ninguna cuenta coincide con los filtros."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left">
            <thead className="border-b border-border">
              <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
                <th className="py-2 pr-4 font-semibold">Persona</th>
                <th className="py-2 pr-4 font-semibold">Organización</th>
                <th className="py-2 pr-4 font-semibold">Manager</th>
                <th className="py-2 pr-4 font-semibold">Último login</th>
                <th className="py-2 pr-4 text-right font-semibold">Asignados completados</th>
                <th className="py-2 text-right font-semibold">Completados en total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.user_id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4">
                    <span className="block text-sm font-semibold text-fg">{a.full_name}</span>
                    <span className="block text-xs text-fg-muted">{a.email}</span>
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-fg-muted">{a.org_name}</td>
                  <td className="py-2.5 pr-4 text-sm text-fg-muted">{a.manager_name ?? "—"}</td>
                  <td className="py-2.5 pr-4 text-sm text-fg">
                    <span className="flex items-center gap-2">
                      {formatLogin(a.last_login_at)}
                      {a.is_inactive && (
                        <span
                          title="Sin actividad en más de 21 días"
                          className="rounded-full bg-tone-late-bg px-1.5 py-0.5 text-[10px] font-semibold text-tone-late-fg"
                        >
                          Inactivo
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-fg">
                    {a.modules_assigned_completed}
                    <span className="text-fg-muted"> / {a.modules_assigned}</span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-xs text-fg">
                    {a.modules_completed}
                    {a.modules_completed > a.modules_assigned_completed && (
                      <span
                        title="Completados que no forman parte de lo asignado"
                        className="ml-1.5 text-fg-muted"
                      >
                        (+{a.modules_completed - a.modules_assigned_completed} no asignados)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-fg-muted">
        <span>
          {filtered.length === 0
            ? "0 cuentas"
            : `${current * ACCOUNTS_PAGE_SIZE + 1}–${current * ACCOUNTS_PAGE_SIZE + rows.length} de ${filtered.length}`}
          {filtering && accounts.length !== filtered.length ? ` (filtrado de ${accounts.length})` : ""}
        </span>
        <span className="flex items-center gap-2">
          {filtering && (
            <button type="button" onClick={reset} className="font-semibold text-primary hover:underline">
              Limpiar filtros
            </button>
          )}
          <button
            type="button"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            className="rounded-md border border-border px-2.5 py-1 font-semibold text-fg hover:bg-bg-sunken disabled:opacity-40"
          >
            Anterior
          </button>
          <button
            type="button"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
            className="rounded-md border border-border px-2.5 py-1 font-semibold text-fg hover:bg-bg-sunken disabled:opacity-40"
          >
            Siguiente
          </button>
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────── Assessment agregado ───────────────────────────

export function AssessmentOverviewWidget({ data }: { data: AssessmentOverview }) {
  if (data.with_results === 0) {
    return (
      <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-fg-muted">
        Todavía nadie completó el assessment.
      </p>
    );
  }
  return (
    <div>
      <p className="mb-4 text-xs text-fg-muted">
        {data.with_results} de {data.total_users} personas con resultados del assessment.
        Los grupos de menos de {data.min_group} personas se ocultan para no identificar a nadie.
      </p>
      <div className="flex flex-col gap-4">
        {data.dimensions.map((d) => {
          const top = d.states[0]?.count ?? 0;
          return (
            <div key={d.code}>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-sm font-semibold text-fg">{dimensionShortName(d.code)}</span>
                <span className="font-mono text-xs text-fg-muted">{d.n} personas</span>
              </div>
              {d.suppressed ? (
                <p className="text-xs text-fg-subtle">
                  Grupo menor a {data.min_group}: no se muestra para proteger la privacidad.
                </p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {d.states.map((s) => (
                    <li key={s.state_label} className="flex items-center gap-3 text-xs">
                      <span className="w-40 shrink-0 truncate text-fg-muted" title={s.state_label}>
                        {s.state_label}
                      </span>
                      <MeterBar value={s.count} max={top} tone="bg-primary" />
                      <span className="w-24 shrink-0 whitespace-nowrap text-right font-mono tabular-nums">
                        <span className="text-fg">{s.count}</span>
                        <span className="text-fg-muted"> · {pct(s.count, d.n)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      <WidgetSrTable
        caption="Estados del assessment por dimensión "
        columns={["Dimensión", "Estado", "Personas"]}
        rows={data.dimensions.flatMap((d) =>
          d.suppressed
            ? [[DIMENSION_SHORT_LABEL[d.code] ?? d.code, "Grupo pequeño: oculto", d.n]]
            : d.states.map((s) => [DIMENSION_SHORT_LABEL[d.code] ?? d.code, s.state_label, s.count]),
        )}
      />
    </div>
  );
}

// ─────────────────────────── Seguimiento de managers ───────────────────────────

const MANAGER_STATUS: Record<ManagerEngagementRow["status"], { label: string; cls: string }> = {
  engaged: { label: "Con seguimiento", cls: "bg-tone-sel-bg text-tone-ok-fg" },
  no_follow_up: { label: "Sin seguimiento", cls: "bg-tone-late-bg text-tone-late-fg" },
  no_team: { label: "Sin equipo", cls: "bg-bg-sunken text-fg-muted" },
};

export function ManagerEngagementWidget({ data }: { data: ManagerEngagement }) {
  if (data.managers.length === 0) {
    return (
      <p className="flex h-40 items-center justify-center px-4 text-center text-sm text-fg-muted">
        No hay managers en este alcance.
      </p>
    );
  }
  return (
    <div>
      <p className="text-sm text-fg-muted">
        <span className="font-mono text-2xl font-semibold text-fg">
          {data.engagement_rate === null ? "—" : `${Math.round(data.engagement_rate * 100)}%`}
        </span>{" "}
        de los managers con equipo hizo seguimiento en los últimos {data.window_days} días (
        {data.engaged} de {data.managers_with_team}).
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[40rem] text-left">
          <thead className="border-b border-border">
            <tr className="font-sans text-micro uppercase tracking-meta text-fg-muted">
              <th className="py-2 pr-4 font-semibold">Manager</th>
              <th className="py-2 pr-4 font-semibold">Organización</th>
              <th className="py-2 pr-4 text-right font-semibold">Equipo activo</th>
              <th className="py-2 pr-4 text-right font-semibold">Revisó</th>
              <th className="py-2 pr-4 text-right font-semibold">Asignó</th>
              <th className="py-2 pr-4 font-semibold">Último login</th>
              <th className="py-2 font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.managers.map((m) => {
              const st = MANAGER_STATUS[m.status];
              return (
                <tr key={m.user_id} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 text-sm font-semibold text-fg">{m.full_name}</td>
                  <td className="py-2.5 pr-4 text-sm text-fg-muted">{m.org_name}</td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-fg">
                    {m.team_active}/{m.team_size}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-fg">
                    {m.reviewed_members}/{m.team_size}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono text-xs text-fg">
                    {m.assignments_made}
                  </td>
                  <td className="py-2.5 pr-4 text-sm text-fg">{formatLogin(m.last_login_at)}</td>
                  <td className="py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}
                    >
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────── Licencias por organización ───────────────────────────

export function LicenseByOrg({ orgs }: { orgs: LicenseOrgUsage[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {orgs.map((o) => {
        const over = o.quota > 0 && o.used > o.quota;
        return (
          <li key={o.org_id} className="flex items-center gap-3 text-sm">
            <span className="w-40 shrink-0 truncate text-fg" title={o.org_name}>
              {o.org_name}
            </span>
            <MeterBar
              value={o.used}
              max={o.quota || o.used}
              tone={over ? "bg-danger" : "bg-primary"}
            />
            <span className="w-24 text-right font-mono text-xs text-fg-muted">
              {o.used}/{o.quota > 0 ? o.quota : "sin cupo"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
