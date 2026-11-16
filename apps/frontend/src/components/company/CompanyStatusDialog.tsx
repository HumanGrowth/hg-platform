"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiChangeCompanyStatus, apiErrorMessage } from "@/lib/api";
import {
  ALLOWED_TRANSITIONS,
  fill,
  formatLongDate,
  needsConfirmation,
  ROLE_LABELS,
  STATUS_BADGE,
} from "@/lib/company-lifecycle";
import { getCopy, type Lang } from "@/lib/i18n";
import { toast } from "@/lib/toast-store";
import type { Company, CompanyStatus, LifecyclePreview } from "@/lib/types";

/**
 * Cambio de estado de una Empresa (ADR-0016), en dos pasos:
 *  1. elegir el nuevo estado → vista previa (dry-run, no escribe nada);
 *  2. ver los números → motivo → (suspender/terminar) escribir el slug → aplicar.
 * Los usuarios de la empresa NO se modifican nunca.
 */
export function CompanyStatusDialog({
  company,
  open,
  onClose,
  onChanged,
  lang = "es",
}: {
  company: Company;
  open: boolean;
  onClose: () => void;
  onChanged: (company: Company) => void;
  lang?: Lang;
}) {
  const c = getCopy(lang).companyLifecycle;
  const [target, setTarget] = React.useState<CompanyStatus | "">("");
  const [preview, setPreview] = React.useState<LifecyclePreview | null>(null);
  const [reason, setReason] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setTarget("");
    setPreview(null);
    setReason("");
    setSlug("");
    setBusy(false);
    setError(null);
  }, [open, company.id]);

  const options = ALLOWED_TRANSITIONS[company.status];
  const confirm = target !== "" && needsConfirmation(target);
  const canApply =
    preview !== null &&
    !busy &&
    (!confirm || (reason.trim().length > 0 && slug.trim() === company.slug));

  async function onPreview() {
    if (target === "") return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiChangeCompanyStatus(company.id, { to_status: target, dry_run: true });
      setPreview(res.preview);
    } catch (err) {
      setError(apiErrorMessage(err, c.dialog.error));
    } finally {
      setBusy(false);
    }
  }

  async function onApply() {
    if (target === "" || !canApply) return;
    setBusy(true);
    setError(null);
    try {
      const res = await apiChangeCompanyStatus(company.id, {
        to_status: target,
        reason: reason.trim() || null,
        confirm_slug: confirm ? slug.trim() : null,
      });
      toast(c.dialog.applied, "success");
      onChanged(res.company);
      onClose();
    } catch (err) {
      setError(apiErrorMessage(err, c.dialog.error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={fill(c.dialog.title, { name: company.name })}
      className="max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <span>{c.dialog.current}:</span>
          <Badge variant={STATUS_BADGE[company.status]}>{c.statusLabels[company.status]}</Badge>
        </div>

        {options.length === 0 ? (
          <p className="text-sm text-fg-muted">{c.dialog.noTransitions}</p>
        ) : (
          <div>
            <Label htmlFor="lc-target">{c.dialog.target}</Label>
            <Select
              id="lc-target"
              value={target}
              disabled={preview !== null || busy}
              onChange={(e) => setTarget(e.target.value as CompanyStatus | "")}
            >
              <option value="">{c.dialog.targetPlaceholder}</option>
              {options.map((s) => (
                <option key={s} value={s}>
                  {c.statusLabels[s]}
                </option>
              ))}
            </Select>
          </div>
        )}

        {preview ? (
          <section
            aria-label={c.dialog.previewTitle}
            data-testid="lifecycle-preview"
            className="rounded-md border border-border bg-bg-sunken p-4"
          >
            <p className="mb-2 font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted">
              {c.dialog.previewTitle}
            </p>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              <dt className="text-fg-muted">{c.dialog.activeUsers}</dt>
              <dd className="font-mono text-fg">{preview.active_users_total}</dd>
              {Object.entries(preview.active_users_by_role).map(([role, n]) => (
                <React.Fragment key={role}>
                  <dt className="pl-4 text-fg-subtle">{ROLE_LABELS[role] ?? role}</dt>
                  <dd className="font-mono text-fg-muted">{n}</dd>
                </React.Fragment>
              ))}
              <dt className="text-fg-muted">{c.dialog.pendingInvites}</dt>
              <dd className="font-mono text-fg">{preview.pending_invitations}</dd>
              <dt className="text-fg-muted">{c.dialog.admins}</dt>
              <dd className="font-mono text-fg">{preview.admins}</dd>
            </dl>
            {preview.grace_ends_at ? (
              <p className="mt-3 text-sm font-semibold text-warning">
                {fill(c.dialog.graceEnds, { date: formatLongDate(preview.grace_ends_at, lang) })}
              </p>
            ) : null}
          </section>
        ) : null}

        {preview ? (
          <>
            <div>
              <Label htmlFor="lc-reason">{c.dialog.reason}</Label>
              <textarea
                id="lc-reason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="glass-fill-strong w-full rounded-md border border-border bg-bg-raised px-4 py-2 font-sans text-sm text-fg focus:border-primary focus:outline-none focus:ring-2 focus:ring-hg-amber/40"
              />
              <p className="mt-1 text-xs text-fg-muted">
                {confirm ? c.dialog.reasonRequired : c.dialog.reasonOptional}
              </p>
            </div>
            {confirm ? (
              <div>
                <Label htmlFor="lc-slug">
                  {fill(c.dialog.confirmSlug, { slug: company.slug })}
                </Label>
                <Input
                  id="lc-slug"
                  value={slug}
                  autoComplete="off"
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-2 flex justify-end gap-3">
          {preview ? (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                setPreview(null);
                setError(null);
              }}
            >
              {c.dialog.back}
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose}>
              {c.dialog.cancel}
            </Button>
          )}
          {preview ? (
            <Button
              variant={confirm ? "destructive" : "primary"}
              disabled={!canApply}
              onClick={() => void onApply()}
            >
              {busy ? c.dialog.applying : c.dialog.apply}
            </Button>
          ) : (
            <Button disabled={target === "" || busy} onClick={() => void onPreview()}>
              {busy ? c.dialog.previewing : c.dialog.preview}
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
