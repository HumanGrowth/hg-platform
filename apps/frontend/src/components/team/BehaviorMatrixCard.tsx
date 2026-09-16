"use client";

import { CheckCircle2, Clock } from "lucide-react";
import * as React from "react";

import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetBehaviorMatrix, apiUpsertBehaviorEvaluations, ApiError } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { BehaviorMatrix, PillarBehaviors } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const RATING_OPTIONS: { value: 1 | 2 | 3; label: string }[] = [
  { value: 1, label: "Sin demostrar" },
  { value: 2, label: "En progreso" },
  { value: 3, label: "Demostrando" },
];

interface Props {
  userId: string;
}

/** Matriz de comportamientos del pilar en curso — el manager califica cada
 * comportamiento en 3 puntos. Guardado optimista: la fila muestra el rating
 * elegido de inmediato y confirma/revierte según la respuesta del PUT
 * (`apiUpsertBehaviorEvaluations`), que trae la matriz recalculada
 * (`manager_approved`) para el estado de aprobación del badge de nivel. */
export function BehaviorMatrixCard({ userId }: Props) {
  const [matrix, setMatrix] = React.useState<BehaviorMatrix | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok" | "empty">("loading");
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const data = await apiGetBehaviorMatrix(userId);
      setMatrix(data);
      setStatus(data.pillars.every((p) => p.behaviors.length === 0) ? "empty" : "ok");
    } catch {
      setStatus("error");
    }
  }, [userId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function rate(behaviorId: string, rating: 1 | 2 | 3) {
    if (!matrix) return;
    const previous = matrix;
    // Optimista: refleja el rating elegido ya mismo en la fila.
    setMatrix({
      ...matrix,
      pillars: matrix.pillars.map((p) => ({
        ...p,
        behaviors: p.behaviors.map((b) =>
          b.behavior_id === behaviorId ? { ...b, rating } : b,
        ),
      })),
    });
    setSavingIds((s) => new Set(s).add(behaviorId));
    try {
      const updated = await apiUpsertBehaviorEvaluations(userId, [
        { behavior_id: behaviorId, rating },
      ]);
      setMatrix(updated);
    } catch (e) {
      setMatrix(previous);
      toast(
        e instanceof ApiError && e.status === 422
          ? "No se pudo guardar: comportamiento inválido."
          : "No se pudo guardar la calificación.",
        "danger",
      );
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(behaviorId);
        return next;
      });
    }
  }

  if (status === "loading") {
    return (
      <div className="rounded-lg border border-border bg-bg-raised p-5">
        <div className="h-24 animate-pulse rounded-md bg-bg-sunken" />
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-lg border border-border bg-bg-raised p-5 text-sm text-fg-muted">
        No pudimos cargar la matriz de comportamientos.
      </div>
    );
  }
  if (!matrix || status === "empty") {
    return (
      <div className="rounded-lg border border-dashed border-border bg-bg-sunken p-5 text-sm text-fg-muted">
        Todavía no hay comportamientos cargados para {matrix?.dimension_name ?? "esta dimensión"}.
      </div>
    );
  }

  const current = matrix.pillars.find((p) => p.is_current);
  const rest = matrix.pillars.filter((p) => !p.is_current);

  return (
    <section className="rounded-lg border border-border bg-bg-raised p-5">
      <Eyebrow className="mb-1">Comportamientos del pilar en curso</Eyebrow>
      <p className="mb-4 text-xs text-fg-subtle">{matrix.dimension_name}</p>

      {current ? (
        <PillarTable pillar={current} savingIds={savingIds} onRate={rate} />
      ) : (
        <p className="text-sm text-fg-muted">Sin un pilar en curso identificado todavía.</p>
      )}

      <ApprovalStatus matrix={matrix} />

      {rest.length > 0 && (
        <details className="mt-5 rounded-md border border-border">
          <summary className="cursor-pointer select-none px-4 py-2.5 font-sans text-sm font-semibold text-fg">
            Otros pilares de {matrix.dimension_name} ({rest.length})
          </summary>
          <div className="flex flex-col gap-5 border-t border-border p-4">
            {rest.map((p) => (
              <PillarTable key={p.pillar_code} pillar={p} savingIds={savingIds} onRate={rate} />
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

/** El manager tiene la decisión final: el badge de nivel de esta dimensión
 * solo se otorga si, además de aprendizaje+assessment, TODOS los
 * comportamientos activos están calificados "Demostrando". No es una
 * ponderación numérica — es un estado de verificación. */
function ApprovalStatus({ matrix }: { matrix: BehaviorMatrix }) {
  if (matrix.manager_approved) {
    return (
      <p className="mt-4 flex items-center gap-1.5 text-xs text-success">
        <CheckCircle2 size={14} strokeWidth={2} className="shrink-0" />
        Aprobado — habilita el badge de nivel de {matrix.dimension_name} (junto con el completion de
        aprendizaje y assessment).
      </p>
    );
  }
  return (
    <p className="mt-4 flex items-center gap-1.5 text-xs text-fg-subtle">
      <Clock size={14} strokeWidth={2} className="shrink-0" />
      Pendiente de aprobación — calificá "Demostrando" todos los comportamientos activos para
      habilitar el badge de nivel de {matrix.dimension_name}.
    </p>
  );
}

function PillarTable({
  pillar,
  savingIds,
  onRate,
}: {
  pillar: PillarBehaviors;
  savingIds: Set<string>;
  onRate: (behaviorId: string, rating: 1 | 2 | 3) => void;
}) {
  return (
    <div>
      <p className="mb-2 font-sans text-sm font-semibold text-fg">{pillar.pillar_name}</p>
      <ul className="flex flex-col gap-3">
        {pillar.behaviors.map((b) => (
          <li key={b.behavior_id} className="rounded-md border border-border bg-surface-card p-3">
            <p className="text-sm text-fg">{b.text}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <div
                role="radiogroup"
                aria-label={b.text}
                className="inline-flex overflow-hidden rounded-md border border-border"
              >
                {RATING_OPTIONS.map((opt, i) => {
                  const checked = b.rating === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      onClick={() => onRate(b.behavior_id, opt.value)}
                      className={`px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
                        i > 0 ? "border-l border-border" : ""
                      } ${
                        checked
                          ? "bg-hg-amber text-white"
                          : "bg-bg-raised text-fg-muted hover:bg-bg-sunken"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {savingIds.has(b.behavior_id) && (
                <span className="text-xs text-fg-subtle">Guardando…</span>
              )}
              {!savingIds.has(b.behavior_id) && b.rating !== null && b.evaluated_by_name && (
                <span className="text-xs text-fg-subtle">
                  {b.evaluated_by_name}
                  {b.updated_at ? ` · ${formatRelativeTime(b.updated_at)}` : ""}
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
