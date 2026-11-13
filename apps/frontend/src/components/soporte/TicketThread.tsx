import { actorLabel, formatSupportDate } from "@/lib/support";

export interface ThreadItem {
  id: string;
  actor_kind: string;
  body: string;
  created_at: string;
  /** Solo el panel admin ve notas internas; se rotulan con texto, no solo con color. */
  is_internal?: boolean;
}

/** Hilo de mensajes de un ticket. `viewer` decide cómo se nombra al autor. */
export function TicketThread({
  items,
  viewer,
}: {
  items: ThreadItem[];
  viewer: "user" | "admin";
}) {
  if (items.length === 0) {
    return <p className="text-sm text-fg-muted">Todavía no hay mensajes en este ticket.</p>;
  }
  return (
    <ol className="flex flex-col gap-3" aria-label="Conversación del ticket">
      {items.map((item) => {
        const mine = item.actor_kind === viewer;
        return (
          <li
            key={item.id}
            className={
              item.is_internal
                ? "rounded-md border border-dashed border-border bg-bg-sunken p-3"
                : mine
                  ? "rounded-md border border-border bg-bg-raised p-3"
                  : "rounded-md border border-border bg-bg-sunken p-3"
            }
          >
            <div className="mb-1 flex flex-wrap items-baseline gap-2 text-xs text-fg-muted">
              <span className="font-semibold text-fg">{actorLabel(item.actor_kind, viewer)}</span>
              {item.is_internal ? <span className="font-semibold">· Nota interna</span> : null}
              <time dateTime={item.created_at}>{formatSupportDate(item.created_at)}</time>
            </div>
            <p className="whitespace-pre-wrap text-sm text-fg">{item.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
