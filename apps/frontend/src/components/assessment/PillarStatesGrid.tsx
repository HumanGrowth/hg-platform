"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiConfirmResult } from "@/lib/api";
import { PILLAR_NAMES, canRetake, sourceLabel } from "@/lib/assessment-utils";
import type { AssessmentPillarCode, PillarResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-store";

// Badge color: P6A/P6B usan el color de P6.
const pillarBadge = (code: AssessmentPillarCode) => {
  const base = code.startsWith("P6") ? "p6" : code.toLowerCase();
  return `pillar-${base}` as NonNullable<BadgeProps["variant"]>;
};
// Para el CTA de detalle, P6A/P6B usan su propio código.
const detailHref = (code: AssessmentPillarCode) => `/onboarding/detail/${code}` as Route;

export function PillarStatesGrid({
  results,
  onChanged,
}: {
  results: PillarResult[];
  onChanged?: () => void;
}) {
  const [confirming, setConfirming] = React.useState<PillarResult | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

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
    <section className="mt-12">
      <Eyebrow>Tus dimensiones</Eyebrow>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => (
          <Card key={r.pillar_code} className="flex flex-col gap-3 bg-cream-50">
            <div className="flex items-center justify-between">
              <Badge variant={pillarBadge(r.pillar_code)}>{r.pillar_code}</Badge>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  r.source === "confirmed"
                    ? "bg-success-bg text-success"
                    : "bg-cream-200 text-fg-muted",
                )}
              >
                {sourceLabel(r.source)}
              </span>
            </div>
            <h3 className="font-sans text-md font-semibold text-fg">
              {PILLAR_NAMES[r.pillar_code]}
            </h3>
            <p className="font-sans text-sm font-semibold text-orange-700">{r.state_label}</p>
            {r.recaida_detected && (
              <span className="w-fit rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">
                ⚠ Recaída detectada
              </span>
            )}
            {r.suggested_next_step && (
              <p className="line-clamp-1 text-xs text-fg-muted">{r.suggested_next_step}</p>
            )}

            {r.requires_user_confirmation && (
              <button
                type="button"
                onClick={() => setConfirming(r)}
                className="w-fit rounded-md bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-100"
              >
                ¿Te reconocés en este perfil? Confirmá tu nivel
              </button>
            )}

            <div className="mt-auto">
              {r.source === "preliminary" ? (
                <Link
                  href={detailHref(r.pillar_code)}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start px-0 hover:bg-transparent")}
                >
                  Evaluar en detalle
                  <ArrowRight size={16} strokeWidth={1.75} />
                </Link>
              ) : canRetake(r) ? (
                <Link
                  href={detailHref(r.pillar_code)}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start px-0 hover:bg-transparent")}
                >
                  Re-evaluar
                  <ArrowRight size={16} strokeWidth={1.75} />
                </Link>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Confirmá tu nivel"
        description={confirming ? PILLAR_NAMES[confirming.pillar_code] : undefined}
      >
        <p className="text-sm text-fg-muted">
          Según tus respuestas tenés una red sólida. El siguiente nivel (Generativo) implica que
          <strong> ayudás activamente a otros a conectar</strong>. ¿Te reconocés en ese perfil?
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirming(null)}>
            Todavía no
          </Button>
          <Button
            disabled={submitting}
            onClick={() => confirming && confirm(confirming.pillar_code)}
          >
            {submitting ? "Confirmando…" : "Sí, me reconozco"}
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
