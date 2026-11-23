"use client";

import { Check } from "lucide-react";
import { type KeyboardEvent, useId, useRef, useState } from "react";

import { Reveal } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { type PeoplePhoto, PhotoFrame } from "@/components/marketing/people/PhotoFrame";
import { cn } from "@/lib/utils";

const PHOTOS: readonly PeoplePhoto[] = ["dia-1-escritorio", "dia-2-colegas", "dia-3-taller", "dia-4-pizarra"];

/**
 * "Así entra HG en un día de trabajo": cuatro momentos como pestañas (patrón
 * ARIA tabs: flechas, Inicio/Fin, foco itinerante). Cada panel es una foto de
 * ambientación con una tarjeta de la plataforma con datos de ejemplo.
 */
export function DayAtWork() {
  const copy = useMarketingCopy();
  const c = copy.humanize.dayAtWork;
  const [active, setActive] = useState(0);
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = `${uid}-panel`;

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const n = c.moments.length;
    const next =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? (active + 1) % n
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? (active - 1 + n) % n
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? n - 1
              : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabsRef.current[next]?.focus();
  };

  const moment = c.moments[active];

  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <SectionHeader title={c.title} subtitle={c.body} />

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
        <Reveal>
          <div role="tablist" aria-label={c.tablistLabel} aria-orientation="vertical" className="flex flex-col gap-2">
            {c.moments.map((m, i) => {
              const on = i === active;
              return (
                <button
                  key={m.title}
                  ref={(el) => {
                    tabsRef.current[i] = el;
                  }}
                  id={tabId(i)}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  aria-controls={panelId}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  onKeyDown={onKeyDown}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-xl border px-6 py-5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg",
                    on ? "glass-surface-strong border-primary" : "border-transparent hover:bg-surface-card",
                  )}
                >
                  <span className="font-heading text-sm font-semibold text-fg-muted">{m.time}</span>
                  <span className="font-heading text-xl font-semibold leading-tight text-fg">{m.title}</span>
                  {on ? <span className="max-w-[40ch] text-[15px] leading-relaxed text-fg-muted">{m.text}</span> : null}
                </button>
              );
            })}
          </div>
        </Reveal>

        <Reveal variant="scale" delay={0.1}>
          <div id={panelId} role="tabpanel" aria-labelledby={tabId(active)} className="relative">
            <PhotoFrame
              key={PHOTOS[active]}
              photo={PHOTOS[active]}
              alt={moment.alt}
              sizes="(min-width: 1024px) 720px, 92vw"
              className="aspect-[4/3] md:aspect-[16/11]"
            />
            <div className="glass-surface-strong relative mt-4 flex flex-col gap-3 p-6 md:absolute md:right-6 md:top-6 md:mt-0 md:w-[min(340px,calc(100%-48px))]">
              <MomentCard index={active} />
            </div>
          </div>
          <p className="mt-4 text-xs font-medium text-fg-muted">{copy.humanize.sampleData}</p>
        </Reveal>
      </div>
    </section>
  );
}

const CARD_EYEBROW = "font-heading text-[13px] font-semibold text-hg-orange-700";
const CARD_TITLE = "m-0 font-heading text-xl font-semibold leading-tight text-fg";

function Bar({ value, tone }: { value: number; tone: "primary" | "soft" }) {
  return (
    <div className="h-2 overflow-hidden rounded-sm border border-border bg-surface-card">
      <div className={cn("h-full", tone === "primary" ? "bg-primary" : "bg-primary opacity-40")} style={{ width: `${value}%` }} />
    </div>
  );
}

/** Tarjeta de producto de cada momento (maqueta estática, datos de ejemplo). */
function MomentCard({ index }: { index: number }) {
  const c = useMarketingCopy().humanize.dayAtWork;
  if (index === 0) {
    return (
      <>
        <span className={CARD_EYEBROW}>{c.module.eyebrow}</span>
        <h3 className={CARD_TITLE}>{c.module.title}</h3>
        <div className="flex gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={cn("h-1.5 flex-1 rounded-sm", i < 4 ? "bg-primary" : "bg-border-strong")} />
          ))}
        </div>
        <p className="m-0 text-sm text-fg-muted">{c.module.body}</p>
      </>
    );
  }
  if (index === 1) {
    return (
      <>
        <h3 className={CARD_TITLE}>{c.plan.title}</h3>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {c.plan.items.map((it) => (
            <li key={it.label} className="flex items-center gap-3 rounded-lg border border-border bg-surface-card px-3.5 py-3">
              <span
                aria-hidden
                className={cn(
                  "grid h-[22px] w-[22px] flex-none place-items-center rounded-sm",
                  it.done ? "bg-primary text-white" : "border-[1.5px] border-fg-muted",
                )}
              >
                {it.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
              </span>
              <span className="text-sm text-fg">{it.label}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (index === 2) {
    return (
      <>
        <span className={CARD_EYEBROW}>{c.event.eyebrow}</span>
        <h3 className={CARD_TITLE}>{c.event.title}</h3>
      </>
    );
  }
  return (
    <>
      <span className={CARD_EYEBROW}>{c.team.eyebrow}</span>
      <span className="display text-[40px] leading-none text-fg">{c.team.value}%</span>
      <p className="m-0 text-sm text-fg-muted">{c.team.body}</p>
      <Bar value={c.team.value} tone="primary" />
      <Bar value={c.team.orgValue} tone="soft" />
    </>
  );
}
