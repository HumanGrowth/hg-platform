"use client";

import * as React from "react";

import { DimensionSummaryCard } from "@/components/perfil/DimensionSummaryCard";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiConfirmResult } from "@/lib/api";
import { DIMENSIONS } from "@/lib/dimensions";
import { PILLAR_FULL_LABEL } from "@/lib/pillars";
import type { AssessmentPillarCode, PillarResult } from "@/lib/types";
import { toast } from "@/lib/toast-store";

/**
 * Sección unificada "Tu progreso por dimensión" (refinamiento de Perfil).
 * Reemplaza las 3 secciones antiguas (progreso + estados + reevaluar) por una
 * sola grilla de 6 cards, una por dimensión. Maneja el diálogo de confirmación
 * de nivel (antes en PillarStatesGrid).
 */
export function DimensionSummarySection({
  results,
  radar,
  onChanged,
}: {
  results: PillarResult[];
  radar: Record<string, number>;
  onChanged?: () => void;
}) {
  const [confirming, setConfirming] = React.useState<PillarResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Resultado representativo por dimensión (ES → su assessmentPillar P6A).
  const resultFor = React.useCallback(
    (assessmentPillar: string, pillar: string) =>
      results.find((r) => r.pillar_code === assessmentPillar) ??
      results.find((r) => r.pillar_code.startsWith(pillar)),
    [results],
  );

  async function confirm(pillar: AssessmentPillarCode) {
    setSubmitting(true);
    try {
      await apiConfirmResult(pillar);
      toast("¡Nivel confirmado!", "success");
      setConfirming(null);
      onChanged?.();
    } catch {
      toast("No pudimos confirmar tu nivel.", "danger");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-12" id="dimensiones">
      <Eyebrow>Tu progreso por dimensión</Eyebrow>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {DIMENSIONS.map((d) => (
          <DimensionSummaryCard
            key={d.code}
            dimension={d}
            score={radar[d.pillar] ?? 0}
            result={resultFor(d.assessmentPillar, d.pillar)}
            onConfirm={setConfirming}
          />
        ))}
      </div>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Confirmá tu nivel"
        description={confirming ? PILLAR_FULL_LABEL[confirming.pillar_code] : undefined}
      >
        <p className="text-sm text-fg-muted">
          Según tus respuestas tenés una base sólida. El siguiente nivel implica que
          <strong> ayudás activamente a otros</strong>. ¿Te reconocés en ese perfil?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            Todavía no
          </Button>
          <Button disabled={submitting} onClick={() => confirming && confirm(confirming.pillar_code)}>
            {submitting ? "Confirmando…" : "Sí, me reconozco"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
