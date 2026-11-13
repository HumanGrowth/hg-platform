"use client";

import * as React from "react";

import { SuperadminGate } from "@/components/SuperadminGate";
import { AttachmentList } from "@/components/soporte/AttachmentList";
import { TicketStatusBadge } from "@/components/soporte/TicketStatusBadge";
import { TicketThread, type ThreadItem } from "@/components/soporte/TicketThread";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import {
  apiAdminGetSupportTicket,
  apiAdminListSupportTickets,
  apiAdminNoteSupportTicket,
  apiAdminPatchSupportTicket,
  apiAdminReplySupportTicket,
  apiErrorMessage,
} from "@/lib/api";
import {
  SUPPORT_CATEGORIES_LIST,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_SEVERITY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  formatSupportDate,
} from "@/lib/support";
import { toast } from "@/lib/toast-store";
import type {
  AdminSupportTicket,
  AdminSupportTicketDetail,
  SupportCategory,
  SupportSeverity,
  SupportStatus,
} from "@/lib/types";

const SELECT_CLASS =
  "h-10 rounded-md border border-border bg-bg-raised px-3 text-sm text-fg";
const TEXTAREA_CLASS =
  "w-full resize-y rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-fg";

function statusLabel(value: unknown): string {
  return SUPPORT_STATUS_LABELS[value as SupportStatus] ?? String(value);
}

/** Mensajes, notas y cambios de estado del ticket, en orden cronológico. */
function toThread(t: AdminSupportTicketDetail): ThreadItem[] {
  const items: ThreadItem[] = [
    { id: `${t.id}-first`, actor_kind: "user", body: t.body, created_at: t.created_at },
  ];
  for (const e of t.events) {
    if (e.event_type === "status_changed" && e.data) {
      items.push({
        id: e.id,
        actor_kind: e.actor_kind,
        body: `Estado: ${statusLabel(e.data.from)} → ${statusLabel(e.data.to)}`,
        created_at: e.created_at,
        is_internal: true,
      });
    } else if (e.event_type === "field_changed" && e.data) {
      items.push({
        id: e.id,
        actor_kind: e.actor_kind,
        body: `${String(e.data.field)}: ${String(e.data.from)} → ${String(e.data.to)}`,
        created_at: e.created_at,
        is_internal: true,
      });
    } else if (e.body) {
      items.push({
        id: e.id,
        actor_kind: e.actor_kind,
        body: e.body,
        created_at: e.created_at,
        is_internal: e.is_internal,
      });
    }
  }
  return items;
}

function TicketAdminDetail({
  ticketId,
  onChanged,
}: {
  ticketId: string;
  onChanged: () => void;
}) {
  const [ticket, setTicket] = React.useState<AdminSupportTicketDetail | null>(null);
  const [error, setError] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [sendEmail, setSendEmail] = React.useState(true);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    apiAdminGetSupportTicket(ticketId)
      .then((t) => !cancelled && setTicket(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  /** Ejecuta una acción del panel; devuelve `true` si salió bien (para limpiar el campo). */
  async function run(action: () => Promise<AdminSupportTicketDetail>, ok: string): Promise<boolean> {
    setBusy(true);
    try {
      setTicket(await action());
      toast(ok, "success");
      onChanged();
      return true;
    } catch (err) {
      toast(apiErrorMessage(err, "No se pudo completar la acción."), "danger");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-fg-muted">No se pudo cargar el ticket.</p>;
  if (!ticket) return <p className="text-sm text-fg-muted">Cargando…</p>;

  return (
    <div className="flex flex-col gap-5">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <div><dt className="inline text-fg-muted">De: </dt><dd className="inline">{ticket.reporter_name ?? "—"} &lt;{ticket.reporter_email}&gt;</dd></div>
        <div><dt className="inline text-fg-muted">Origen: </dt><dd className="inline">{ticket.source === "app" ? "App" : "Formulario público"}{ticket.reporter_role ? ` · ${ticket.reporter_role}` : ""}</dd></div>
        <div><dt className="inline text-fg-muted">Página: </dt><dd className="inline">{ticket.page_url ?? "—"}</dd></div>
        <div><dt className="inline text-fg-muted">Versión: </dt><dd className="inline">{ticket.app_version ?? "—"}</dd></div>
        <div className="sm:col-span-2"><dt className="inline text-fg-muted">Navegador: </dt><dd className="inline break-words">{ticket.user_agent ?? "—"}</dd></div>
        <div><dt className="inline text-fg-muted">Org: </dt><dd className="inline">{ticket.org_id ?? "Sin org (público)"}</dd></div>
        <div><dt className="inline text-fg-muted">Creado: </dt><dd className="inline">{formatSupportDate(ticket.created_at)}</dd></div>
      </dl>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label htmlFor="adm-status">Estado</Label>
          <select
            id="adm-status"
            className={SELECT_CLASS}
            value={ticket.status}
            disabled={busy}
            onChange={(e) =>
              void run(
                () => apiAdminPatchSupportTicket(ticket.id, { status: e.target.value as SupportStatus }),
                "Estado actualizado.",
              )
            }
          >
            {SUPPORT_STATUSES.map((s) => (
              <option key={s} value={s}>{SUPPORT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="adm-category">Categoría</Label>
          <select
            id="adm-category"
            className={SELECT_CLASS}
            value={ticket.category}
            disabled={busy}
            onChange={(e) =>
              void run(
                () => apiAdminPatchSupportTicket(ticket.id, { category: e.target.value as SupportCategory }),
                "Categoría actualizada.",
              )
            }
          >
            {SUPPORT_CATEGORIES_LIST.map((c) => (
              <option key={c} value={c}>{SUPPORT_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="adm-severity">Severidad</Label>
          <select
            id="adm-severity"
            className={SELECT_CLASS}
            value={ticket.severity}
            disabled={busy}
            onChange={(e) =>
              void run(
                () => apiAdminPatchSupportTicket(ticket.id, { severity: e.target.value as SupportSeverity }),
                "Severidad actualizada.",
              )
            }
          >
            {(Object.keys(SUPPORT_SEVERITY_LABELS) as SupportSeverity[]).map((s) => (
              <option key={s} value={s}>{SUPPORT_SEVERITY_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <AttachmentList scope="admin" ticketId={ticket.id} attachments={ticket.attachments} />
      <TicketThread items={toThread(ticket)} viewer="admin" />

      <div>
        <Label htmlFor="adm-reply">Responder al usuario</Label>
        <textarea id="adm-reply" rows={4} maxLength={5000} value={reply} onChange={(e) => setReply(e.target.value)} className={TEXTAREA_CLASS} />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-fg">
            <input type="checkbox" className="accent-primary" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Enviar por correo
          </label>
          <Button
            size="sm"
            disabled={busy || !reply.trim()}
            onClick={() =>
              void run(() => apiAdminReplySupportTicket(ticket.id, reply.trim(), sendEmail), "Respuesta enviada.").then((ok) => ok && setReply(""))
            }
          >
            Responder
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor="adm-note">Nota interna (el usuario no la ve)</Label>
        <textarea id="adm-note" rows={2} maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} className={TEXTAREA_CLASS} />
        <div className="mt-2 flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || !note.trim()}
            onClick={() =>
              void run(() => apiAdminNoteSupportTicket(ticket.id, note.trim()), "Nota guardada.").then((ok) => ok && setNote(""))
            }
          >
            Guardar nota
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdminSoporteContent() {
  const [tickets, setTickets] = React.useState<AdminSupportTicket[] | null>(null);
  const [total, setTotal] = React.useState(0);
  const [failed, setFailed] = React.useState(false);
  const [status, setStatus] = React.useState<SupportStatus | "">("");
  const [category, setCategory] = React.useState<SupportCategory | "">("");
  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setFailed(false);
    try {
      const res = await apiAdminListSupportTickets({
        status: status || undefined,
        category: category || undefined,
        q: query || undefined,
      });
      setTickets(res.items);
      setTotal(res.total);
    } catch {
      setFailed(true);
      setTickets([]);
    }
  }, [status, category, query]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <Eyebrow accent>Panel HG</Eyebrow>
      <Display variant="display-3" className="mt-1">
        Soporte
      </Display>
      <p className="mt-2 text-sm text-fg-muted">{total} tickets</p>

      <form
        className="mt-6 flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(q.trim());
        }}
      >
        <div>
          <Label htmlFor="f-status">Estado</Label>
          <select id="f-status" className={SELECT_CLASS} value={status} onChange={(e) => setStatus(e.target.value as SupportStatus | "")}>
            <option value="">Todos</option>
            {SUPPORT_STATUSES.map((s) => (
              <option key={s} value={s}>{SUPPORT_STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="f-category">Categoría</Label>
          <select id="f-category" className={SELECT_CLASS} value={category} onChange={(e) => setCategory(e.target.value as SupportCategory | "")}>
            <option value="">Todas</option>
            {SUPPORT_CATEGORIES_LIST.map((c) => (
              <option key={c} value={c}>{SUPPORT_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[220px] flex-1">
          <Label htmlFor="f-q">Buscar (código, asunto, email)</Label>
          <Input id="f-q" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary">Buscar</Button>
      </form>

      {tickets === null && <p className="mt-8 text-sm text-fg-muted">Cargando…</p>}
      {failed && (
        <Card className="mt-8 flex flex-col items-center gap-4 py-10 text-center">
          <p className="text-sm text-fg-muted">No se pudieron cargar los tickets.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>Reintentar</Button>
        </Card>
      )}
      {tickets !== null && !failed && tickets.length === 0 && (
        <Card className="mt-8 py-10 text-center">
          <p className="text-sm text-fg-muted">No hay tickets con estos filtros.</p>
        </Card>
      )}
      {tickets !== null && tickets.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Tickets de soporte</caption>
            <thead className="bg-bg-sunken text-xs uppercase tracking-meta text-fg-muted">
              <tr>
                <th scope="col" className="px-4 py-3">Código</th>
                <th scope="col" className="px-4 py-3">Asunto</th>
                <th scope="col" className="px-4 py-3">De</th>
                <th scope="col" className="px-4 py-3">Categoría</th>
                <th scope="col" className="px-4 py-3">Estado</th>
                <th scope="col" className="px-4 py-3">Creado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-bg-sunken">
                  <td className="px-4 py-3 font-semibold">{t.code}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-left font-medium text-primary hover:underline" onClick={() => setOpenId(t.id)}>
                      {t.subject}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">
                    {t.reporter_email}
                    {t.source === "public" ? <Badge className="ml-2">Público</Badge> : null}
                  </td>
                  <td className="px-4 py-3">{SUPPORT_CATEGORY_LABELS[t.category]}</td>
                  <td className="px-4 py-3"><TicketStatusBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-fg-muted">{formatSupportDate(t.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title={tickets?.find((t) => t.id === openId)?.subject ?? "Ticket"}
        className="max-w-3xl"
      >
        {openId ? <TicketAdminDetail ticketId={openId} onChanged={() => void load()} /> : null}
      </Dialog>
    </main>
  );
}

export default function AdminSoportePage() {
  return (
    <SuperadminGate>
      <AdminSoporteContent />
    </SuperadminGate>
  );
}
