"use client";

import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { SupportTicketForm } from "@/components/soporte/SupportTicketForm";
import { TicketStatusBadge } from "@/components/soporte/TicketStatusBadge";
import { TicketThread, type ThreadItem } from "@/components/soporte/TicketThread";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  apiErrorMessage,
  apiGetMySupportTicket,
  apiListMySupportTickets,
  apiReplyMySupportTicket,
} from "@/lib/api";
import { SUPPORT_CATEGORY_LABELS, formatSupportDate } from "@/lib/support";
import { toast } from "@/lib/toast-store";
import type { SupportTicket, SupportTicketDetail } from "@/lib/types";

function toThread(ticket: SupportTicketDetail): ThreadItem[] {
  const first: ThreadItem = {
    id: `${ticket.id}-first`,
    actor_kind: "user",
    body: ticket.body,
    created_at: ticket.created_at,
  };
  const rest = ticket.events
    .filter((e) => e.body)
    .map((e) => ({
      id: e.id,
      actor_kind: e.actor_kind,
      body: e.body as string,
      created_at: e.created_at,
    }));
  return [first, ...rest];
}

function TicketDetail({
  ticketId,
  onChanged,
}: {
  ticketId: string;
  onChanged: () => void;
}) {
  const [ticket, setTicket] = React.useState<SupportTicketDetail | null>(null);
  const [error, setError] = React.useState(false);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    apiGetMySupportTicket(ticketId)
      .then((t) => !cancelled && setTicket(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [ticketId]);

  async function send() {
    if (!reply.trim()) return;
    setSending(true);
    try {
      setTicket(await apiReplyMySupportTicket(ticketId, reply.trim()));
      setReply("");
      onChanged();
    } catch (err) {
      toast(apiErrorMessage(err, "No pudimos enviar tu respuesta."), "danger");
    } finally {
      setSending(false);
    }
  }

  if (error) return <p className="text-sm text-fg-muted">No pudimos cargar este ticket.</p>;
  if (!ticket) return <EmptyRing label="Cargando…" />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm text-fg-muted">
        <TicketStatusBadge status={ticket.status} />
        <span>{SUPPORT_CATEGORY_LABELS[ticket.category]}</span>
        <span>· {formatSupportDate(ticket.created_at)}</span>
      </div>
      <TicketThread items={toThread(ticket)} viewer="user" />
      <div>
        <label htmlFor="support-reply" className="mb-1 block text-sm font-medium text-fg">
          Agregar un mensaje
        </label>
        <textarea
          id="support-reply"
          rows={3}
          maxLength={5000}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          className="w-full resize-y rounded-md border border-border bg-bg-raised px-3 py-2 text-sm text-fg"
        />
        <div className="mt-2 flex justify-end">
          <Button size="sm" onClick={() => void send()} disabled={sending || !reply.trim()}>
            {sending ? "Enviando…" : "Enviar"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SoportePage() {
  const [tickets, setTickets] = React.useState<SupportTicket[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [openId, setOpenId] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      setTickets((await apiListMySupportTickets()).items);
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Soporte</Eyebrow>
      <Display variant="display-2" className="mt-2">
        ¿Necesitás ayuda?
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Contanos qué pasó y una persona del equipo te responde por correo. Podés seguir tus
        solicitudes acá.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-sans text-lg font-bold text-fg">Nueva solicitud</h2>
          <SupportTicketForm
            onCreated={(t) => {
              void load();
              setOpenId(t.id);
            }}
          />
        </Card>

        <section aria-labelledby="my-tickets-title">
          <h2 id="my-tickets-title" className="mb-4 font-sans text-lg font-bold text-fg">
            Mis solicitudes
          </h2>
          {status === "loading" && (
            <Card className="flex items-center justify-center py-12">
              <EmptyRing label="Cargando…" />
            </Card>
          )}
          {status === "error" && (
            <Card className="flex flex-col items-center gap-4 py-10 text-center">
              <p className="text-sm text-fg-muted">No pudimos cargar tus solicitudes.</p>
              <Button variant="secondary" size="sm" onClick={() => void load()}>
                Reintentar
              </Button>
            </Card>
          )}
          {status === "ok" && tickets.length === 0 && (
            <Card className="py-10 text-center">
              <p className="text-sm text-fg-muted">Todavía no enviaste ninguna solicitud.</p>
            </Card>
          )}
          {status === "ok" && tickets.length > 0 && (
            <ul className="flex flex-col gap-3">
              {tickets.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpenId(t.id)}
                    className="w-full rounded-lg border border-border bg-bg-raised p-4 text-left transition-colors hover:bg-bg-sunken"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-fg-muted">{t.code}</span>
                      <TicketStatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 font-sans text-sm font-semibold text-fg">{t.subject}</p>
                    <p className="mt-1 text-xs text-fg-muted">{formatSupportDate(t.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog
        open={openId !== null}
        onClose={() => setOpenId(null)}
        title={tickets.find((t) => t.id === openId)?.subject ?? "Solicitud"}
      >
        {openId ? <TicketDetail ticketId={openId} onChanged={() => void load()} /> : null}
      </Dialog>
    </main>
  );
}
