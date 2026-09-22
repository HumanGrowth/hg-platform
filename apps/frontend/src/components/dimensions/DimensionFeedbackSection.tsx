"use client";

/**
 * "Feedback de tu manager" (H8): el colaborador ve sus propias calificaciones
 * de comportamiento — el mismo dato que gatea el badge de nivel de esta
 * dimensión (`_manager_approved` en badges/progression.py). Antes existía el
 * endpoint (GET /me/behavior-feedback, sin las notas del manager — privadas
 * por default) pero ninguna pantalla lo mostraba: el colaborador no tenía
 * forma de saber por qué un badge quedaba "pendiente de aprobación".
 *
 * Vive en /dimensiones/[code] (no en /perfil): es el detalle de UNA dimensión,
 * igual que "Áreas de crecimiento" y el estado del assessment de esta misma
 * página — no un resumen cross-dimensión.
 */
import * as React from "react";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetMyBehaviorFeedback } from "@/lib/api";
import type { DimensionCode } from "@/lib/dimensions";
import type { MyBehaviorEvaluation } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const RATING_LABEL: Record<number, string> = {
  1: "Sin demostrar",
  2: "En progreso",
  3: "Demostrando",
};

const RATING_TONE: Record<number, string> = {
  1: "text-fg-subtle",
  2: "text-warning",
  3: "text-success",
};

export function DimensionFeedbackSection({ dimensionCode }: { dimensionCode: DimensionCode }) {
  const [all, setAll] = React.useState<MyBehaviorEvaluation[] | null>(null);

  React.useEffect(() => {
    apiGetMyBehaviorFeedback()
      .then(setAll)
      .catch(() => setAll([]));
  }, []);

  const rows = (all ?? []).filter((e) => e.dimension_code === dimensionCode);
  if (all === null || rows.length === 0) return null;

  const allDemonstrating = rows.every((e) => e.rating === 3);

  return (
    <section className="mt-8" id="feedback-manager">
      <Eyebrow>Feedback de tu manager</Eyebrow>
      <p className="mt-1 text-sm text-fg-muted">
        Cómo te calificó tu manager en los comportamientos de esta dimensión. Necesitás
        &quot;Demostrando&quot; en todos para desbloquear el badge de nivel.
      </p>
      <Card className="mt-4 flex flex-col gap-3 bg-bg-raised">
        {rows.map((e) => (
          <div key={e.behavior_id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0 flex-1 text-fg">{e.text}</span>
            <span className={`shrink-0 whitespace-nowrap font-sans text-xs font-semibold ${RATING_TONE[e.rating] ?? "text-fg-muted"}`}>
              {RATING_LABEL[e.rating] ?? "—"}
            </span>
          </div>
        ))}
        <p className="mt-1 text-xs text-fg-subtle">
          {allDemonstrating
            ? "Aprobado — actualizado " + formatRelativeTime(rows[0].updated_at) + "."
            : "Pendiente de aprobación."}
        </p>
      </Card>
    </section>
  );
}
