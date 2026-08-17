"use client";

/**
 * Configuración → Privacidad (docx §6.1). El colaborador ve y cambia sus dos
 * autorizaciones (jefe directo / RRHH) en cualquier momento; revocar tiene efecto
 * en un máximo de 24 h. Ley 8968 CR.
 */
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiGetConsent, apiSetConsent } from "@/lib/api";
import { toast } from "@/lib/toast-store";

export default function PrivacySettingsPage() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [manager, setManager] = React.useState(false);
  const [hr, setHr] = React.useState(false);

  React.useEffect(() => {
    apiGetConsent()
      .then((s) => {
        setManager(s.consent_manager === true);
        setHr(s.consent_hr === true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function save(nextManager: boolean, nextHr: boolean) {
    setSaving(true);
    const prev = { manager, hr };
    setManager(nextManager);
    setHr(nextHr);
    try {
      await apiSetConsent(nextManager, nextHr);
      toast("Listo — tu preferencia de privacidad quedó guardada.", "success");
    } catch {
      setManager(prev.manager);
      setHr(prev.hr);
      toast("No pudimos guardar el cambio. Probá de nuevo.", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto flex w-full max-w-app flex-1 items-center justify-center px-6 py-16">
        <EmptyRing label="Cargando tus preferencias…" />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-10">
      <Eyebrow accent>Configuración</Eyebrow>
      <Display variant="display-3" className="mt-1">
        Privacidad y visibilidad de datos
      </Display>
      <p className="mt-3 text-sm text-fg-muted">
        Vos decidís quién de tu empresa puede ver tu progreso. Podés cambiarlo cuando quieras;
        desactivar tiene efecto en un máximo de 24&nbsp;horas.
      </p>

      <Card className="mt-8 flex flex-col divide-y divide-border p-0">
        <label className="flex cursor-pointer items-start justify-between gap-4 p-5">
          <span className="text-sm">
            <span className="font-semibold text-fg">Mi jefe directo puede ver mi progreso</span>
            <span className="mt-1 block text-fg-muted">
              Verá qué pilares completaste y recibirá un aviso cuando completes uno — no tus
              respuestas ni tu actividad detallada.
            </span>
          </span>
          <input
            type="checkbox"
            checked={manager}
            disabled={saving}
            onChange={(e) => save(e.target.checked, hr)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-hg-line"
          />
        </label>
        <label className="flex cursor-pointer items-start justify-between gap-4 p-5">
          <span className="text-sm">
            <span className="font-semibold text-fg">RRHH puede ver mis datos agregados</span>
            <span className="mt-1 block text-fg-muted">
              RRHH ve tendencias del equipo, no un perfil individual expuesto fuera de tu línea de
              reporte.
            </span>
          </span>
          <input
            type="checkbox"
            checked={hr}
            disabled={saving}
            onChange={(e) => save(manager, e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-hg-line"
          />
        </label>
      </Card>

      {manager || hr ? (
        <div className="mt-6">
          <Button variant="secondary" disabled={saving} onClick={() => save(false, false)}>
            Revocar todo
          </Button>
        </div>
      ) : null}

      <p className="mt-8 border-t border-hg-line pt-4 text-xs text-fg-muted">
        Este consentimiento se rige por la Ley N.° 8968 de Costa Rica. Revocarlo no afecta tu acceso
        a HumanGrowth.
      </p>
    </main>
  );
}
