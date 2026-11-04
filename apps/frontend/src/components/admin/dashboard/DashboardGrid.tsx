"use client";

import { ArrowDown, ArrowUp, GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import * as React from "react";

import { apiGetDashboardPrefs, apiPutDashboardPrefs, apiResetDashboardPrefs } from "@/lib/api";
import {
  type DashboardLayout,
  moveBefore,
  moveBy,
  resolveLayout,
  toggleHidden,
} from "@/lib/dashboard-layout";
import { toast } from "@/lib/toast-store";
import { cn } from "@/lib/utils";

export type WidgetSpan = "kpi" | "third" | "half" | "full";

export interface DashboardWidgetDef<Ctx> {
  /** Estable: se guarda en las preferencias del usuario (a-z, 0-9, _). */
  id: string;
  /** Nombre en el modo de edición. */
  title: string;
  span: WidgetSpan;
  /** Si no aplica al contexto (p. ej. sin licencias), no se muestra ni se lista. */
  available?: (ctx: Ctx) => boolean;
  render: (ctx: Ctx) => React.ReactNode;
}

const SPAN_CLASS: Record<WidgetSpan, string> = {
  kpi: "col-span-12 sm:col-span-6 lg:col-span-3",
  third: "col-span-12 lg:col-span-4",
  half: "col-span-12 lg:col-span-6",
  full: "col-span-12",
};

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber",
        checked ? "border-tone-sel-border bg-tone-done" : "border-border-strong bg-bg-sunken",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-white shadow transition-all",
          checked ? "left-[1.1rem]" : "left-0.5",
        )}
      />
    </button>
  );
}

/**
 * Grilla de widgets personalizable por usuario: arrastrar para reordenar (con
 * flechas como alternativa de teclado/táctil) e interruptor para mostrar u
 * ocultar cada widget. El layout se guarda en el backend (por administrador) y
 * cada cambio se persiste al instante; si falla, se revierte.
 */
export function DashboardGrid<Ctx>({
  dashboard,
  widgets,
  ctx,
}: {
  dashboard: "org";
  widgets: DashboardWidgetDef<Ctx>[];
  ctx: Ctx;
}) {
  const available = React.useMemo(
    () => widgets.filter((w) => (w.available ? w.available(ctx) : true)),
    [widgets, ctx],
  );
  const availableIds = React.useMemo(() => available.map((w) => w.id), [available]);
  const byId = React.useMemo(() => new Map(available.map((w) => [w.id, w])), [available]);

  const [saved, setSaved] = React.useState<DashboardLayout | null>(null);
  const [ready, setReady] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    apiGetDashboardPrefs(dashboard)
      .then((l) => alive && setSaved(l))
      .catch(() => undefined) // sin preferencias → layout por defecto
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, [dashboard]);

  const layout = React.useMemo(() => resolveLayout(availableIds, saved), [availableIds, saved]);

  const commit = React.useCallback(
    async (next: DashboardLayout) => {
      const prev = saved;
      setSaved(next);
      try {
        await apiPutDashboardPrefs(dashboard, next);
      } catch {
        setSaved(prev);
        toast("No se pudo guardar tu configuración del dashboard", "danger");
      }
    },
    [dashboard, saved],
  );

  const reset = React.useCallback(async () => {
    const prev = saved;
    setSaved(null);
    try {
      await apiResetDashboardPrefs(dashboard);
    } catch {
      setSaved(prev);
      toast("No se pudo restablecer el dashboard", "danger");
    }
  }, [dashboard, saved]);

  if (!ready) {
    return <div className="h-40 animate-pulse rounded-lg bg-bg-sunken" aria-hidden />;
  }

  const hiddenSet = new Set(layout.hidden);
  const shown = editing ? layout.order : layout.order.filter((id) => !hiddenSet.has(id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
        {editing ? (
          <>
            <p className="mr-auto text-xs text-fg-muted">
              Arrastra los widgets para reordenarlos (o usa las flechas) y usa el interruptor para
              mostrarlos u ocultarlos. Tu configuración es personal.
            </p>
            <button
              type="button"
              onClick={() => void reset()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold text-fg hover:bg-bg-sunken"
            >
              <RotateCcw size={14} strokeWidth={1.75} />
              Restablecer
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover"
            >
              Listo
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border-strong px-3 py-1.5 text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} />
            Personalizar
          </button>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        {shown.map((id) => {
          const w = byId.get(id);
          if (!w) return null;
          const isHidden = hiddenSet.has(id);
          return (
            <div
              key={id}
              draggable={editing}
              onDragStart={(e) => {
                setDragId(id);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", id);
              }}
              onDragOver={(e) => {
                if (!dragId) return;
                e.preventDefault();
                setOverId(id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId && dragId !== id) {
                  void commit({ ...layout, order: moveBefore(layout.order, dragId, id) });
                }
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
              className={cn(
                SPAN_CLASS[w.span],
                "min-w-0",
                editing && "flex flex-col gap-2 rounded-lg border border-dashed border-border-strong p-2",
                editing && overId === id && dragId !== id && "border-solid border-tone-sel-border bg-tone-sel-bg",
                editing && dragId === id && "opacity-40",
              )}
            >
              {editing && (
                <div className="flex items-center gap-1.5">
                  <GripVertical
                    size={16}
                    strokeWidth={1.75}
                    aria-hidden
                    className="cursor-grab text-fg-subtle"
                  />
                  <span className="mr-auto truncate text-xs font-semibold text-fg">{w.title}</span>
                  <button
                    type="button"
                    aria-label={`Subir ${w.title}`}
                    onClick={() => void commit({ ...layout, order: moveBy(layout.order, id, -1) })}
                    className="rounded p-1 text-fg-muted hover:bg-bg-sunken"
                  >
                    <ArrowUp size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    aria-label={`Bajar ${w.title}`}
                    onClick={() => void commit({ ...layout, order: moveBy(layout.order, id, 1) })}
                    className="rounded p-1 text-fg-muted hover:bg-bg-sunken"
                  >
                    <ArrowDown size={14} strokeWidth={1.75} />
                  </button>
                  <Switch
                    checked={!isHidden}
                    label={`Mostrar ${w.title}`}
                    onChange={() =>
                      void commit({ ...layout, hidden: toggleHidden(layout.hidden, id) })
                    }
                  />
                </div>
              )}
              {editing && isHidden ? (
                <div className="flex h-20 items-center justify-center rounded-lg bg-bg-sunken text-sm text-fg-muted">
                  Oculto: actívalo con el interruptor para volver a verlo.
                </div>
              ) : (
                <div className={cn("min-w-0", editing && "pointer-events-none select-none")}>
                  {w.render(ctx)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
