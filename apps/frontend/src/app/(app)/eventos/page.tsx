"use client";

import * as React from "react";

import { EventCard } from "@/components/eventos/EventCard";
import { EventosHero } from "@/components/eventos/EventosHero";
import { EmptyRing } from "@/components/EmptyRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { apiListCommunityEvents } from "@/lib/api";
import type { CommunityEvent } from "@/lib/types";

type Section = "live" | "upcoming" | "past" | "material";

function categorize(e: CommunityEvent, now: number): Section {
  if (e.type === "material") return "material";
  const isPast = e.starts_at != null && new Date(e.starts_at).getTime() < now;
  if (isPast) return "past";
  if (e.type === "live_webinar" || e.type === "masterclass_live") return "live";
  return "upcoming";
}

const SECTION_META: Record<Section, { title: string; variant: "grid" | "row" }> = {
  live: { title: "Próximos en vivo", variant: "row" },
  upcoming: { title: "Webinars próximos", variant: "grid" },
  past: { title: "Webinars pasados", variant: "grid" },
  material: { title: "Material relevante", variant: "grid" },
};
const ORDER: Section[] = ["live", "upcoming", "past", "material"];

export default function EventosPage() {
  const [events, setEvents] = React.useState<CommunityEvent[]>([]);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setEvents(await apiListCommunityEvents());
      setStatus("ok");
    } catch {
      setStatus("error");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const now = Date.now();
  const featured = events.filter((e) => e.is_featured).slice(0, 3);
  const bySection = React.useMemo(() => {
    const map: Record<Section, CommunityEvent[]> = { live: [], upcoming: [], past: [], material: [] };
    for (const e of events) map[categorize(e, now)].push(e);
    return map;
  }, [events, now]);

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      <Eyebrow accent>Eventos</Eyebrow>
      <Display variant="display-2" className="mt-2">
        Eventos y comunidad
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Webinars en vivo, grabaciones y material para seguir creciendo.
      </p>

      {status === "loading" && (
        <Card className="mt-8 flex items-center justify-center py-16">
          <EmptyRing label="Cargando eventos…" />
        </Card>
      )}

      {status === "error" && (
        <Card className="mt-8 flex flex-col items-center gap-4 py-12 text-center">
          <p className="text-sm text-fg-muted">No pudimos cargar los eventos.</p>
          <Button variant="secondary" size="sm" onClick={() => void load()}>
            Reintentar
          </Button>
        </Card>
      )}

      {status === "ok" && events.length === 0 && (
        <Card className="mt-8 flex items-center justify-center py-16">
          <p className="text-sm text-fg-muted">Todavía no hay eventos publicados.</p>
        </Card>
      )}

      {status === "ok" && events.length > 0 && (
        <>
          {featured.length > 0 && (
            <div className="mt-8">
              <EventosHero events={featured} />
            </div>
          )}

          {ORDER.map((section) => {
            const items = bySection[section];
            if (items.length === 0) return null;
            const meta = SECTION_META[section];
            return (
              <section key={section} className="mt-10">
                <Eyebrow>{meta.title}</Eyebrow>
                <div
                  className={
                    meta.variant === "row"
                      ? "mt-4 flex flex-col gap-3"
                      : "mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  }
                >
                  {items.map((e) => (
                    <EventCard key={e.id} event={e} variant={meta.variant} />
                  ))}
                </div>
              </section>
            );
          })}
        </>
      )}
    </main>
  );
}
