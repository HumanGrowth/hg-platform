"use client";

import { Check, Sparkles, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { AISoonBadge } from "@/components/shared/AISoonBadge";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiAiSummary, apiDeleteTip, apiListTips, apiUpdateTip } from "@/lib/api";
import { dimensionToPillar, pillarShortName } from "@/lib/pillars";
import { toast } from "@/lib/toast-store";
import type { SavedTip } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "pending" | "done";

function dimName(code: string | null): string {
  if (!code) return "General";
  try {
    return pillarShortName(dimensionToPillar(code));
  } catch {
    return code;
  }
}

export default function PlanAccionPage() {
  const [tips, setTips] = React.useState<SavedTip[] | null>(null);
  const [statusF, setStatusF] = React.useState<StatusFilter>("all");
  const [dimF, setDimF] = React.useState<string | null>(null);
  const [ai, setAi] = React.useState<{ enabled: boolean; suggestions: string[] } | null>(null);

  const load = React.useCallback(() => {
    apiListTips().then(setTips).catch(() => setTips([]));
  }, []);

  React.useEffect(() => {
    load();
    apiAiSummary().then(setAi).catch(() => setAi({ enabled: false, suggestions: [] }));
  }, [load]);

  async function toggle(t: SavedTip) {
    try {
      await apiUpdateTip(t.id, { is_completed: !t.is_completed });
      load();
    } catch {
      toast("No pudimos actualizar el tip.", "danger");
    }
  }

  async function remove(id: string) {
    try {
      await apiDeleteTip(id);
      load();
    } catch {
      toast("No pudimos eliminar el tip.", "danger");
    }
  }

  const all = tips ?? [];
  const doneCount = all.filter((t) => t.is_completed).length;
  const dims = Array.from(new Set(all.map((t) => t.dimension_code ?? "")));

  const filtered = all.filter((t) => {
    if (statusF === "pending" && t.is_completed) return false;
    if (statusF === "done" && !t.is_completed) return false;
    if (dimF !== null && (t.dimension_code ?? "") !== dimF) return false;
    return true;
  });

  // Agrupar por dimensión (columnas tipo pizarra).
  const byDim = new Map<string, SavedTip[]>();
  for (const t of filtered) {
    const key = t.dimension_code ?? "";
    byDim.set(key, [...(byDim.get(key) ?? []), t]);
  }

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Plan de Acción</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Tu Plan de Acción
      </Display>
      <p className="mt-2 text-sm text-fg-muted">
        {all.length} {all.length === 1 ? "tip guardado" : "tips guardados"} · {doneCount} completado
        {doneCount === 1 ? "" : "s"}
      </p>

      {/* Sugerencias AI (detrás del flag) */}
      {ai && (ai.enabled ? ai.suggestions.length > 0 : true) && (
        <Card className="mt-6 border-hg-amber/40 bg-hg-amber/5">
          <div className="flex items-center gap-2">
            <Sparkles size={18} strokeWidth={1.75} className="text-hg-amber" />
            <span className="font-sans text-sm font-semibold text-fg">Sugerencias personalizadas</span>
          </div>
          {ai.enabled ? (
            <ul className="mt-3 flex flex-col gap-2">
              {ai.suggestions.map((s, i) => (
                <li key={i} className="text-sm text-fg-muted">
                  • {s}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <AISoonBadge variant="pill" label="Próximamente · sugerencias con IA" />
            </div>
          )}
        </Card>
      )}

      {/* Filtros */}
      {all.length > 0 && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {(["all", "pending", "done"] as StatusFilter[]).map((s) => (
              <Chip key={s} active={statusF === s} onClick={() => setStatusF(s)}>
                {s === "all" ? "Todos" : s === "pending" ? "Pendientes" : "Completados"}
              </Chip>
            ))}
          </div>
          {dims.length > 1 && (
            <div className="flex flex-wrap gap-2">
              <Chip active={dimF === null} onClick={() => setDimF(null)}>
                Todas las dimensiones
              </Chip>
              {dims.map((d) => (
                <Chip key={d} active={dimF === d} onClick={() => setDimF(d)}>
                  {dimName(d || null)}
                </Chip>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pizarra */}
      {tips === null ? (
        <div className="mt-8 h-40 animate-pulse rounded-xl bg-bg-sunken" />
      ) : all.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-2 py-16 text-center">
          <p className="font-sans text-md font-semibold text-fg">Todavía no guardaste tips.</p>
          <p className="max-w-prose text-sm text-fg-muted">
            Cuando encuentres una idea que quieras aplicar, dale al botón “Guardar en mi cuaderno” en
            cualquier módulo.
          </p>
          <Link href={"/modulos" as Route} className="mt-2 font-sans text-sm font-semibold text-primary">
            Explorar módulos →
          </Link>
        </Card>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {[...byDim.entries()].map(([dim, list]) => (
            <section key={dim} className="flex flex-col gap-3">
              <p className="font-sans text-micro uppercase tracking-meta text-fg-muted">{dimName(dim || null)}</p>
              {list.map((t) => (
                <Card key={t.id} className={cn("flex flex-col gap-2", t.is_completed && "opacity-60")}>
                  <p className={cn("whitespace-pre-line text-sm text-fg", t.is_completed && "line-through")}>
                    {t.tip_text}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    {t.unit_slug ? (
                      <Link
                        href={`/modulos/${t.unit_slug}` as Route}
                        className="line-clamp-1 text-xs text-fg-subtle hover:text-primary"
                      >
                        {t.unit_title ?? "Ver módulo"}
                      </Link>
                    ) : (
                      <span className="text-xs text-fg-subtle">Nota propia</span>
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void toggle(t)}
                        aria-label={t.is_completed ? "Marcar pendiente" : "Marcar hecho"}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md border",
                          t.is_completed
                            ? "border-success bg-success text-white"
                            : "border-border text-fg-muted hover:border-primary hover:text-primary",
                        )}
                      >
                        <Check size={15} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(t.id)}
                        aria-label="Eliminar"
                        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted hover:bg-bg-sunken hover:text-danger"
                      >
                        <Trash2 size={15} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                </Card>
              ))}
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
