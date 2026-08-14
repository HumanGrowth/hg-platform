"use client";

/**
 * Pantalla de consentimiento de privacidad — copy final del docx
 * HG_Consentimiento_Datos_Copy_v1 (§5). Dos autorizaciones independientes
 * (jefe directo + RRHH). "Confirmar y continuar" guarda lo marcado; "Ahora no"
 * guarda ambos en false (declinado, no pendiente). Ley 8968 CR — pendiente de
 * revisión legal antes de lanzar (docx §8).
 */
import { useRouter } from "next/navigation";
import * as React from "react";

import { apiGetConsent, apiSetConsent } from "@/lib/api";
import { toast } from "@/lib/toast-store";

export default function ConsentScreen() {
  const router = useRouter();
  const [checking, setChecking] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [manager, setManager] = React.useState(false);
  const [hr, setHr] = React.useState(false);

  React.useEffect(() => {
    // Si ya decidió (algún scope no-null), no volver a interrumpir.
    apiGetConsent()
      .then((s) => {
        if (s.consent_manager !== null || s.consent_hr !== null) router.replace("/onboarding/welcome");
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  async function save(consentManager: boolean, consentHr: boolean) {
    setSaving(true);
    try {
      await apiSetConsent(consentManager, consentHr);
      toast("Listo — tu preferencia de privacidad quedó guardada. Puedes cambiarla cuando quieras.", "success");
      router.replace("/onboarding/welcome");
    } catch {
      toast("No pudimos guardar tu preferencia. Probá de nuevo.", "danger");
      setSaving(false);
    }
  }

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16 text-hg-charcoal">
        Cargando…
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col px-6 py-16">
      <h1 className="display text-fg text-[32px] sm:text-[40px]">
        Antes de empezar: decide quién ve tu progreso
      </h1>
      <p className="mt-6 max-w-prose text-hg-charcoal">
        HumanGrowth funciona mejor cuando tu empresa puede ver tu avance y apoyarte. Antes de activar
        eso, queremos que sepas exactamente qué compartimos — y que la decisión sea siempre tuya.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <label className="flex gap-3 rounded-lg border border-hg-line p-4">
          <input
            type="checkbox"
            checked={manager}
            onChange={(e) => setManager(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-hg-line"
          />
          <span className="text-sm">
            <span className="font-semibold text-fg">
              Autorizo que mi jefe directo vea mi progreso por pilar y reciba un aviso cuando complete uno.
            </span>
            <span className="mt-1 block text-hg-charcoal">
              Tu jefe directo verá qué pilares completaste, no tus respuestas ni tu actividad detallada.
            </span>
          </span>
        </label>

        <label className="flex gap-3 rounded-lg border border-hg-line p-4">
          <input
            type="checkbox"
            checked={hr}
            onChange={(e) => setHr(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-hg-line"
          />
          <span className="text-sm">
            <span className="font-semibold text-fg">
              Autorizo que RRHH vea mis datos junto con los de mi equipo, dentro de reportes agregados
              de progreso y adopción.
            </span>
            <span className="mt-1 block text-hg-charcoal">
              RRHH ve tendencias del equipo (quién avanza, quién necesita apoyo), no un perfil
              individual expuesto fuera de tu línea de reporte.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => save(manager, hr)}
          disabled={saving}
          className="rounded-md bg-primary px-8 py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {saving ? "Guardando…" : "Confirmar y continuar →"}
        </button>
        <button
          type="button"
          onClick={() => save(false, false)}
          disabled={saving}
          className="rounded-md border border-hg-line px-8 py-4 font-sans text-base font-semibold text-fg transition-colors hover:bg-hg-line/10 disabled:opacity-50"
        >
          Ahora no
        </button>
      </div>
      <p className="mt-3 text-xs text-hg-charcoal/80">
        Puedes activarlo más adelante desde Configuración → Privacidad. Mientras tanto, tu empresa
        verá tu perfil como “consentimiento pendiente” — no como inactividad ni bajo desempeño.
      </p>

      <p className="mt-8 border-t border-hg-line pt-4 text-xs text-hg-charcoal/70">
        Este consentimiento se rige por la Ley N.° 8968 de Protección de la Persona frente al
        Tratamiento de sus Datos Personales de Costa Rica. Puedes revocarlo cuando quieras desde
        Configuración → Privacidad, sin que esto afecte tu acceso a HumanGrowth.
      </p>
    </div>
  );
}
