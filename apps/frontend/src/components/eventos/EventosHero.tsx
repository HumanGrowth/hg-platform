"use client";

import { ArrowUpRight } from "lucide-react";
import * as React from "react";

import type { CommunityEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROTATE_MS = 6000;

/**
 * Hero rotativo de eventos destacados (Sprint Tarde · TASK 5). Auto-rotate cada
 * 6s + dots + swipe manual en mobile. Respeta reduced-motion (no auto-rota).
 */
export function EventosHero({ events }: { events: CommunityEvent[] }) {
  const [index, setIndex] = React.useState(0);
  const touchX = React.useRef<number | null>(null);

  const count = events.length;
  const go = React.useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  React.useEffect(() => {
    if (count <= 1) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const t = setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS);
    return () => clearInterval(t);
  }, [count]);

  if (count === 0) return null;
  const event = events[index];

  return (
    <section
      aria-roledescription="carousel"
      className="relative overflow-hidden rounded-xl bg-bg-sunken"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="relative min-h-[240px] sm:min-h-[300px]">
        {event.hero_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.hero_image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/10" />
        <div className="relative flex min-h-[240px] flex-col justify-end gap-3 p-6 sm:min-h-[300px] sm:p-8">
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-meta text-white backdrop-blur">
            Destacado
          </span>
          <h2 className="max-w-xl font-display text-2xl leading-tight text-white sm:text-3xl">
            {event.title}
          </h2>
          {event.description && (
            <p className="max-w-lg text-sm text-white/85 line-clamp-2">{event.description}</p>
          )}
          {event.cta_url && (
            <a
              href={event.cta_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-4 py-2 font-sans text-sm font-semibold text-black transition-colors hover:bg-white/90"
            >
              {event.cta_label ?? "Ver más"}
              <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
            </a>
          )}
        </div>
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {events.map((e, i) => (
            <button
              key={e.id}
              type="button"
              aria-label={`Ir al destacado ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
              className={cn(
                "h-2 rounded-full transition-all",
                i === index ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/70",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
