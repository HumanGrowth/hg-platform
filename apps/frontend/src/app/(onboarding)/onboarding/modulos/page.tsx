"use client";

/**
 * Módulos de Onboarding ("capa 0"): destino de `SessionGate` mientras el user
 * está `content_restricted_to_onboarding` — sin asignaciones todavía de su
 * organización/empresa, solo puede ver esta dimensión. Se desbloquea el resto
 * del catálogo al recibir la primera asignación (ver `onboarding.py`), no al
 * completar esto — por eso el estado "todo completo" sigue mostrando un
 * mensaje de espera en vez de redirigir solo.
 */
import { CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { apiGetOnboardingStatus } from "@/lib/api";
import type { OnboardingStatus } from "@/lib/types";

export default function OnboardingModulosPage() {
  const [status, setStatus] = React.useState<OnboardingStatus | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    apiGetOnboardingStatus()
      .then(setStatus)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-center text-sm text-fg-muted">
        No pudimos cargar tu onboarding. Recargá la página.
      </div>
    );
  }
  if (!status) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <EmptyRing label="Preparando tu onboarding…" />
      </div>
    );
  }

  const pct = status.total_count > 0 ? Math.round((status.completed_count / status.total_count) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-6 py-16">
      <h1 className="display text-fg text-[32px] sm:text-[40px]">Bienvenido a Human Growth</h1>
      <p className="mt-4 max-w-prose text-hg-charcoal">
        Antes de ver el resto de la plataforma, completá estos módulos de onboarding. El resto del
        contenido se habilita apenas tu organización te asigne algo.
      </p>

      {status.total_count === 0 ? (
        <p className="mt-10 text-sm text-fg-muted">
          Todavía no hay módulos de onboarding cargados — hablá con tu manager o administrador.
        </p>
      ) : (
        <>
          <div className="mt-10">
            <div className="flex items-center justify-between text-xs text-fg-muted">
              <span>
                {status.completed_count} de {status.total_count} completados
              </span>
              <span>{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <ul className="mt-6 flex flex-col gap-2">
            {status.units.map((u) => (
              <li key={u.unit_id}>
                <Link
                  href={`/onboarding/modulos/${u.slug}` as Route}
                  className="flex items-center gap-3 rounded-lg border border-border bg-bg-raised px-4 py-3 text-sm hover:bg-bg-sunken"
                >
                  {u.completed ? (
                    <CheckCircle2 size={18} strokeWidth={1.75} className="shrink-0 text-success" />
                  ) : (
                    <PlayCircle size={18} strokeWidth={1.75} className="shrink-0 text-fg-subtle" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-fg">{u.title}</span>
                  {u.estimated_minutes && (
                    <span className="shrink-0 text-xs text-fg-subtle">{u.estimated_minutes} min</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {status.all_completed && (
            <div className="mt-8 rounded-lg border border-dashed border-border bg-bg-sunken px-4 py-3 text-sm text-fg-muted">
              Completaste el onboarding. En cuanto tu organización te asigne contenido, vas a ver el
              resto de la plataforma acá mismo.
            </div>
          )}
        </>
      )}
    </div>
  );
}
