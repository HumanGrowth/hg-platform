"use client";

import { Check, Play } from "lucide-react";
import * as React from "react";

import { BadgeIcon } from "@/components/ui/badge-icon";
import type { MyBadge } from "@/lib/types";
import type { LearningUnitFeedItem } from "@/lib/types";
import { cn, formatApproxMinutes } from "@/lib/utils";

/** Code del badge de área en el catálogo (espejo de `pillar_badge_code` del backend). */
export function areaBadgeCode(dimensionCode: string, pillarCode: string): string {
  return `pillar-${dimensionCode}-${pillarCode}`.toLowerCase();
}

/**
 * Un área de crecimiento (pilar) de una dimensión: su insignia, su nombre y los
 * temas que la componen.
 *
 * La lista de temas es **informativa**: no navega. El contenido se abre desde
 * Módulos (que arranca el siguiente de tu ruta) o desde el catálogo de Mi Ruta;
 * acá la unidad es un tema del área, no un link a un curso.
 */
export function AreaCard({
  dimensionCode,
  pillarCode,
  areaName,
  units,
  badge,
}: {
  dimensionCode: string;
  pillarCode: string;
  areaName: string;
  units: LearningUnitFeedItem[];
  /** Badge del catálogo; `undefined` si el área todavía no tiene fila (contenido nuevo). */
  badge: MyBadge | undefined;
}) {
  const completed = units.filter((u) => u.attempt_status === "completed").length;
  // Sin fila de catálogo caemos al cálculo local: todas las unidades completas.
  const unlocked = badge
    ? badge.unlocked
    : units.length > 0 && completed === units.length;

  return (
    <section
      aria-labelledby={`area-${dimensionCode}-${pillarCode}`}
      className="flex flex-col gap-4 rounded-lg border border-border bg-bg-raised p-5"
    >
      <header className="flex items-start gap-4">
        <BadgeIcon
          iconUrl={badge?.icon_url}
          name={badge?.name ?? areaName}
          unlocked={unlocked}
          size={34}
        />
        <div className="min-w-0 flex-1">
          <h3
            id={`area-${dimensionCode}-${pillarCode}`}
            className="font-sans text-md font-semibold leading-tight text-fg"
          >
            {areaName}
          </h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {units.length === 0
              ? "Sin temas publicados todavía"
              : `${completed} de ${units.length} ${units.length === 1 ? "tema" : "temas"} · Insignia ${unlocked ? "desbloqueada" : "bloqueada"}`}
          </p>
        </div>
      </header>

      {units.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {units.map((u) => {
            const done = u.attempt_status === "completed";
            const inProgress = u.attempt_status === "in_progress";
            return (
              <li key={u.id} className="flex items-start gap-2.5 text-sm">
                <span
                  className={cn(
                    "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
                    done && "bg-success text-white",
                    inProgress && "text-primary",
                    !done && !inProgress && "border border-border",
                  )}
                  aria-hidden
                >
                  {done && <Check size={11} strokeWidth={3} />}
                  {inProgress && <Play size={10} strokeWidth={2.5} fill="currentColor" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={cn("text-fg", done && "text-fg-muted")}>{u.title}</span>
                  <span className="ml-2 whitespace-nowrap text-xs text-fg-subtle">
                    {formatApproxMinutes(u.estimated_duration_seconds)}
                    {inProgress ? " · en curso" : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {!unlocked && units.length > 0 && (
        <p className="text-xs text-fg-subtle">
          Completá los {units.length === 1 ? "temas" : `${units.length} temas`} de esta área para
          desbloquear su insignia.
        </p>
      )}
    </section>
  );
}
