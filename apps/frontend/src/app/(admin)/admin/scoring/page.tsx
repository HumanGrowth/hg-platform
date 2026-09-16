"use client";

import * as React from "react";

import { SuperadminGate } from "@/components/SuperadminGate";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { apiListScoringConfig, apiRecomputeScoring, apiUpdateScoringConfig, ApiError } from "@/lib/api";
import { DIMENSIONS } from "@/lib/dimensions";
import { toast } from "@/lib/toast-store";
import type { DimensionScoringConfig } from "@/lib/types";

const DIMENSION_NAME: Record<string, string> = Object.fromEntries(
  DIMENSIONS.map((d) => [d.code, d.name]),
);

type DraftWeights = Record<string, { learning: string; assessment: string }>;

function toDraft(rows: DimensionScoringConfig[]): DraftWeights {
  return Object.fromEntries(
    rows.map((r) => [
      r.dimension_code,
      { learning: String(r.learning_weight), assessment: String(r.assessment_weight) },
    ]),
  );
}

/** Panel superadmin para editar los 2 pesos del score por dimensión
 * (aprendizaje/assessment) y disparar el recompute masivo de
 * `dimension_level_progress` tras un cambio. El feedback del manager NO
 * pondera acá — es un gate de aprobación sobre el badge de nivel (matriz de
 * comportamientos en `/team/[id]`), no un componente del score. */
function ScoringContent() {
  const [rows, setRows] = React.useState<DimensionScoringConfig[] | null>(null);
  const [draft, setDraft] = React.useState<DraftWeights>({});
  const [savingCode, setSavingCode] = React.useState<string | null>(null);
  const [recomputing, setRecomputing] = React.useState(false);

  const load = React.useCallback(() => {
    apiListScoringConfig()
      .then((data) => {
        setRows(data);
        setDraft(toDraft(data));
      })
      .catch(() => setRows([]));
  }, []);
  React.useEffect(load, [load]);

  async function save(code: string) {
    const d = draft[code];
    const learning = Number(d.learning);
    const assessment = Number(d.assessment);
    if ([learning, assessment].some((n) => Number.isNaN(n) || n < 0)) {
      toast("Los pesos deben ser números ≥ 0.", "danger");
      return;
    }
    if (learning + assessment <= 0) {
      toast("La suma de los 2 pesos debe ser mayor a 0.", "danger");
      return;
    }
    setSavingCode(code);
    try {
      await apiUpdateScoringConfig(code, { learning_weight: learning, assessment_weight: assessment });
      toast(`Pesos de ${DIMENSION_NAME[code] ?? code} guardados.`, "success");
      load();
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 422
          ? "Pesos inválidos: deben ser ≥ 0 y sumar más que 0."
          : "No se pudieron guardar los pesos.",
        "danger",
      );
    } finally {
      setSavingCode(null);
    }
  }

  async function recompute(code?: string) {
    setRecomputing(true);
    try {
      const result = await apiRecomputeScoring(code);
      toast(
        `Recalculado: ${result.users_recomputed} usuarios · ${result.dimension_codes.join(", ")}.`,
        "success",
      );
    } catch {
      toast("No se pudo recalcular.", "danger");
    } finally {
      setRecomputing(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <Eyebrow accent>Panel HG</Eyebrow>
      <Display variant="display-3" className="mt-1">
        Pesos del score
      </Display>
      <p className="mt-3 max-w-prose text-sm text-fg-muted">
        El completion 0–100 de cada dimensión combina 2 componentes: aprendizaje y assessment. Los
        pesos no necesitan sumar 1 — el motor renormaliza. El feedback del manager (matriz de
        comportamientos) no pondera acá: es un gate de aprobación sobre el badge de nivel — el
        colaborador necesita el completion Y que el manager haya calificado "Demostrando" todos sus
        comportamientos activos. Después de cambiar pesos, corré el recompute para que el completion
        existente lo refleje.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => void recompute()} disabled={recomputing}>
          {recomputing ? "Recalculando…" : "Recompute masivo (las 6 dimensiones)"}
        </Button>
        <p className="text-xs text-fg-subtle">
          Requiere snapshot de Neon antes de correrlo en producción (ver guardrails del plan).
        </p>
      </div>

      <div className="mt-6 flex flex-col gap-4">
        {rows === null ? (
          <p className="text-sm text-fg-muted">Cargando…</p>
        ) : (
          rows.map((r) => {
            const d = draft[r.dimension_code];
            if (!d) return null;
            return (
              <Card key={r.dimension_code} className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-sm font-semibold text-fg">
                    {DIMENSION_NAME[r.dimension_code] ?? r.dimension_code}{" "}
                    <span className="font-mono text-xs text-fg-subtle">{r.dimension_code}</span>
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`learning-${r.dimension_code}`}>Aprendizaje</Label>
                      <Input
                        id={`learning-${r.dimension_code}`}
                        type="number"
                        step="0.05"
                        min="0"
                        value={d.learning}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [r.dimension_code]: { ...d, learning: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`assessment-${r.dimension_code}`}>Assessment</Label>
                      <Input
                        id={`assessment-${r.dimension_code}`}
                        type="number"
                        step="0.05"
                        min="0"
                        value={d.assessment}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            [r.dimension_code]: { ...d, assessment: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => void recompute(r.dimension_code)}
                    disabled={recomputing}
                  >
                    Recompute
                  </Button>
                  <Button
                    onClick={() => void save(r.dimension_code)}
                    disabled={savingCode === r.dimension_code}
                  >
                    {savingCode === r.dimension_code ? "Guardando…" : "Guardar"}
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </main>
  );
}

export default function AdminScoringPage() {
  return (
    <SuperadminGate>
      <ScoringContent />
    </SuperadminGate>
  );
}
