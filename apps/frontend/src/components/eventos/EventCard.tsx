import { ArrowUpRight, Calendar, FileText } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { CommunityEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

function fmtDate(iso: string | null): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("es", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const DEFAULT_CTA: Record<string, string> = {
  live_webinar: "Registrarme",
  masterclass_live: "Registrarme",
  recorded_webinar: "Ver grabación",
  masterclass_replay: "Ver grabación",
  material: "Abrir",
};

/** Card de un evento de comunidad (Sprint Tarde · TASK 5). */
export function EventCard({ event, variant = "grid" }: { event: CommunityEvent; variant?: "grid" | "row" }) {
  const date = fmtDate(event.starts_at);
  const isMaterial = event.type === "material";
  const ctaLabel = event.cta_label ?? DEFAULT_CTA[event.type] ?? "Ver más";

  return (
    <Card
      className={cn(
        "flex gap-4 overflow-hidden bg-bg-raised p-0",
        variant === "row" ? "flex-row items-stretch" : "flex-col",
      )}
    >
      {event.hero_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.hero_image_url}
          alt=""
          className={cn(
            "object-cover",
            variant === "row" ? "h-auto w-32 shrink-0" : "h-40 w-full",
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center bg-bg-sunken text-fg-subtle",
            variant === "row" ? "w-32 shrink-0" : "h-40 w-full",
          )}
        >
          {isMaterial ? (
            <FileText size={28} strokeWidth={1.5} />
          ) : (
            <Calendar size={28} strokeWidth={1.5} />
          )}
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        {date && (
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Calendar size={13} strokeWidth={2} aria-hidden />
            {date}
          </p>
        )}
        <h3 className="font-sans text-md font-semibold leading-tight text-fg">{event.title}</h3>
        {event.description && (
          <p className="line-clamp-2 text-sm text-fg-muted">{event.description}</p>
        )}
        {event.cta_url && (
          <a
            href={event.cta_url}
            target="_blank"
            rel="noreferrer"
            className="mt-auto inline-flex items-center gap-1 pt-1 font-sans text-sm font-semibold text-primary hover:underline"
          >
            {ctaLabel}
            <ArrowUpRight size={15} strokeWidth={2} aria-hidden />
          </a>
        )}
      </div>
    </Card>
  );
}
