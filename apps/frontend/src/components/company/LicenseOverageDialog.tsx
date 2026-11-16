"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { getCopy, type Lang } from "@/lib/i18n";
import type { LicenseProjection } from "@/lib/types";

/**
 * Se muestra ANTES de enviar invitaciones cuando el uso proyectado supera el pool de
 * licencias (ADR-0016 · LC-06). Dos salidas: ajustar (no se envía nada) o enviar de todos
 * modos (reconocimiento explícito, queda registrado en el backend).
 */
export function LicenseOverageDialog({
  usage,
  open,
  busy = false,
  onAdjust,
  onSendAnyway,
  lang = "es",
}: {
  usage: LicenseProjection;
  open: boolean;
  busy?: boolean;
  onAdjust: () => void;
  onSendAnyway: () => void;
  lang?: Lang;
}) {
  const c = getCopy(lang).companyLifecycle.licenseOverage;
  const rows: [string, number, boolean?][] = [
    [c.active, usage.active],
    [c.invited, usage.invited],
    [c.toInvite, usage.to_invite],
    [c.pool, usage.pool],
    [c.overage, usage.overage, true],
  ];
  return (
    <Dialog open={open} onClose={onAdjust} title={c.title} description={c.body} className="max-w-lg">
      <dl
        data-testid="overage-numbers"
        className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 rounded-md border border-border bg-bg-sunken p-4 text-sm"
      >
        {rows.map(([label, value, strong]) => (
          <div key={label} className="contents">
            <dt className={strong ? "font-semibold text-danger" : "text-fg-muted"}>{label}</dt>
            <dd className={`font-mono ${strong ? "font-semibold text-danger" : "text-fg"}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" disabled={busy} onClick={onAdjust}>
          {c.adjust}
        </Button>
        <Button variant="destructive" disabled={busy} onClick={onSendAnyway}>
          {busy ? c.sending : c.sendAnyway}
        </Button>
      </div>
    </Dialog>
  );
}
