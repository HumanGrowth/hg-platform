"use client";

import * as React from "react";

import { Dialog } from "@/components/ui/dialog";
import { apiListCompanyEvents } from "@/lib/api";
import { fill, formatDateTime } from "@/lib/company-lifecycle";
import { getCopy, type Lang } from "@/lib/i18n";
import type { Company, CompanyLifecycleEvent } from "@/lib/types";

/** Historial de ciclo de vida de una Empresa (más reciente primero). */
export function CompanyEventsDialog({
  company,
  open,
  onClose,
  lang = "es",
}: {
  company: Company;
  open: boolean;
  onClose: () => void;
  lang?: Lang;
}) {
  const c = getCopy(lang).companyLifecycle;
  const [events, setEvents] = React.useState<CompanyLifecycleEvent[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let active = true;
    setEvents(null);
    setFailed(false);
    apiListCompanyEvents(company.id, { limit: 100 })
      .then((p) => active && setEvents(p.items))
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
    };
  }, [open, company.id]);

  function label(e: CompanyLifecycleEvent): string {
    if (e.event_type === "status_change" && e.from_status && e.to_status) {
      return fill(c.events.statusChange, {
        from: c.statusLabels[e.from_status],
        to: c.statusLabels[e.to_status],
      });
    }
    if (e.event_type === "overage_acknowledged") return c.events.overage;
    return c.events.other;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fill(c.events.title, { name: company.name })}
      className="max-w-lg"
    >
      {failed ? (
        <p role="alert" className="text-sm text-danger">
          {c.events.loadError}
        </p>
      ) : events === null ? (
        <p className="text-sm text-fg-muted">{c.events.loading}</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-fg-muted">{c.events.empty}</p>
      ) : (
        <ol className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto">
          {events.map((e) => (
            <li key={e.id} className="border-b border-border pb-3 last:border-0">
              <p className="font-sans text-sm font-semibold text-fg">{label(e)}</p>
              <p className="text-xs text-fg-muted">
                {formatDateTime(e.created_at, lang)} ·{" "}
                {e.actor_name ? fill(c.events.by, { name: e.actor_name }) : c.events.system}
              </p>
              {e.reason ? <p className="mt-1 text-sm text-fg-muted">{e.reason}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}
