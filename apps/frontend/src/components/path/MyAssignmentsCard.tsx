"use client";

import { CalendarClock } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { apiMyAssignments } from "@/lib/api";
import type { ModuleAssignment } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  assigned: "Pendiente",
  in_progress: "En curso",
  completed: "Completado",
  skipped: "Omitido",
};

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("es", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Asignados por tu manager": módulos sueltos que un manager/admin te asignó
 * (`GET /me/assignments`). Es una vista aparte de "Tu ruta": una asignación NO
 * reordena la secuencia, solo destraba el orden — el que reordena es una ruta
 * personalizada (CustomPath). Sin asignaciones (o si falla la carga) no se
 * renderiza nada: es aditivo, nunca un hueco ni un error visible.
 */
export function MyAssignmentsCard() {
  const [items, setItems] = React.useState<ModuleAssignment[]>([]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await apiMyAssignments();
        if (alive) setItems(rows);
      } catch {
        if (alive) setItems([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section aria-labelledby="path-assignments-title">
      <Eyebrow as="h2" id="path-assignments-title">
        Asignados por tu manager
      </Eyebrow>
      <p className="mb-3 mt-2 max-w-prose text-sm text-fg-muted">
        Módulos que te asignaron de forma puntual. No cambian el orden de Tu ruta: los podés empezar
        cuando quieras.
      </p>
      <ul className="glass-surface-strong flex flex-col divide-y divide-border rounded-2xl">
        {items.map((a) => (
          <li key={a.id}>
            <Link
              href={`/modulos/${a.unit_slug}` as Route}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
            >
              <span className="min-w-0">
                <span className="line-clamp-1 block font-heading text-sm font-medium text-fg">
                  {a.unit_title}
                </span>
                <span className="mt-0.5 block text-xs text-fg-muted">
                  {a.assigned_by_name ? `Asignado por ${a.assigned_by_name}` : "Asignado por tu manager"}
                  {` · ${formatDay(a.assigned_at)}`}
                </span>
                {a.note && <span className="mt-0.5 block text-xs text-fg-subtle">“{a.note}”</span>}
              </span>
              <span className="flex items-center gap-3 text-xs">
                {a.due_date && a.status !== "completed" && (
                  <span className="inline-flex items-center gap-1 text-fg-muted">
                    <CalendarClock size={12} strokeWidth={2} aria-hidden />
                    Para el {formatDay(a.due_date)}
                  </span>
                )}
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 font-sans font-semibold",
                    a.status === "completed"
                      ? "bg-success/15 text-success"
                      : "bg-hg-amber/20 text-fg",
                  )}
                >
                  {STATUS_LABEL[a.status] ?? a.status}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
