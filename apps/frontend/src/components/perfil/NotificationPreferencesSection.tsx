"use client";

import type { Route } from "next";
import Link from "next/link";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { apiGetNotificationPreferences, apiSetNotificationPreferences } from "@/lib/api";
import { toast } from "@/lib/toast-store";
import type { NotificationPreferences } from "@/lib/types";

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Preferencias de aviso por email (NT-02, ADR-0018). Un único PUT con ambas
 * preferencias. `null` (nunca decidió) se muestra activo pero NO se trata como
 * decisión: hasta guardar, la persona sigue "sin elegir".
 */
export function NotificationPreferencesSection() {
  const [prefs, setPrefs] = React.useState<NotificationPreferences | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [reminders, setReminders] = React.useState(true);
  const [digest, setDigest] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [announce, setAnnounce] = React.useState("");

  const hydrate = React.useCallback((p: NotificationPreferences) => {
    setPrefs(p);
    setReminders(p.learning_reminders ?? true);
    setDigest(p.leader_digest ?? true);
  }, []);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      hydrate(await apiGetNotificationPreferences());
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, [hydrate]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const undecided =
    prefs !== null &&
    (prefs.learning_reminders === null ||
      (prefs.leader_digest_applicable && prefs.leader_digest === null));
  const dirty =
    prefs !== null &&
    (undecided ||
      reminders !== prefs.learning_reminders ||
      (prefs.leader_digest_applicable && digest !== prefs.leader_digest));

  async function onSave() {
    if (!prefs) return;
    setSaving(true);
    try {
      const saved = await apiSetNotificationPreferences({
        learning_reminders: reminders,
        // Si el interruptor del líder no aplica, se conserva lo guardado (o true por defecto).
        leader_digest: prefs.leader_digest_applicable ? digest : (prefs.leader_digest ?? true),
      });
      hydrate(saved);
      toast("Guardamos tus preferencias de aviso.", "success");
      setAnnounce("Preferencias de notificación guardadas.");
    } catch {
      toast("No pudimos guardar tus preferencias. Probá de nuevo.", "danger");
      setAnnounce("No pudimos guardar tus preferencias.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="bg-surface-card" role="region" aria-labelledby="notif-title">
      <h2 id="notif-title" className="font-sans text-sm font-semibold text-fg">
        Notificaciones
      </h2>
      <p className="mt-1 text-xs text-fg-muted">
        Te escribimos como máximo una vez por semana, solo por email y sin contenido sensible.
      </p>

      {status === "loading" && (
        <div className="flex justify-center py-8">
          <EmptyRing label="Cargando tus preferencias…" size={32} />
        </div>
      )}

      {status === "error" && (
        <div className="mt-4 flex flex-col items-start gap-3">
          <p className="text-sm text-fg-muted">No pudimos cargar tus preferencias.</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </div>
      )}

      {status === "ok" && prefs && (
        <div className="mt-4 flex flex-col gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label htmlFor="notif-reminders" className="mb-0">
                Recordatorios de aprendizaje
              </Label>
              <p id="notif-reminders-help" className="mt-1 text-xs text-fg-muted">
                Un aviso por semana, como máximo, con lo que tenés pendiente para avanzar.
              </p>
            </div>
            <Switch
              id="notif-reminders"
              checked={reminders}
              onCheckedChange={setReminders}
              aria-describedby="notif-reminders-help"
              disabled={saving}
            />
          </div>

          {prefs.leader_digest_applicable && (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <Label htmlFor="notif-digest" className="mb-0">
                  Resumen semanal de mi equipo
                </Label>
                <p id="notif-digest-help" className="mt-1 text-xs text-fg-muted">
                  Solo totales del equipo, nunca nombres ni resultados individuales. Te llega los
                  lunes.
                </p>
              </div>
              <Switch
                id="notif-digest"
                checked={digest}
                onCheckedChange={setDigest}
                aria-describedby="notif-digest-help"
                disabled={saving}
              />
            </div>
          )}

          {undecided && (
            <p className="text-xs text-fg-muted">
              Todavía no elegiste. Guardá para confirmar tu preferencia.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button type="button" size="sm" onClick={() => void onSave()} disabled={!dirty || saving}>
              {saving ? "Guardando…" : "Guardar preferencias"}
            </Button>
            {prefs.updated_at && formatUpdatedAt(prefs.updated_at) && (
              <span className="text-xs text-fg-muted">
                Última actualización: {formatUpdatedAt(prefs.updated_at)}
              </span>
            )}
          </div>

          <p className="text-xs text-fg-muted">
            Lo que compartís con tu jefe y con RRHH se gestiona en{" "}
            <Link
              href={"/configuracion/privacidad" as Route}
              className="font-medium text-fg underline"
            >
              Privacidad
            </Link>
            .
          </p>
        </div>
      )}

      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
    </Card>
  );
}
