"use client";

import { useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { cn } from "@/lib/utils";

type Device = "desktop" | "mobile";

/** Alto (px) de cada captura desktop a 1440 de ancho — evita layout shift. */
const DESKTOP_HEIGHT: Record<string, number> = {
  home: 1180,
  ruta: 1180,
  dimensiones: 1760,
  modulo: 1000,
  plan: 1320,
  eventos: 1320,
  perfil: 1400,
  equipo: 1720,
  rrhh: 2330,
};

/**
 * Recorrido de /plataforma: capturas estáticas del prototipo "HumanGrowth ·
 * Recorrido de plataforma" (9 pantallas × desktop/móvil, en
 * public/marketing/platform-tour). Es contenido de showcase con datos de
 * ejemplo — sin llamadas a la API. Las capturas son dark-glass a propósito
 * (así se ve la app); el marco es glass claro del sitio público.
 */
export function PlatformTour() {
  const c = useMarketingCopy().plataforma.tour;
  const [active, setActive] = useState(0);
  const [device, setDevice] = useState<Device>("desktop");
  const screen = c.screens[active];
  const prefix = device === "desktop" ? "desk" : "mob";
  const src = `/marketing/platform-tour/${prefix}-${screen.id}.webp`;

  function onTabKey(e: React.KeyboardEvent, i: number) {
    const last = c.screens.length - 1;
    const next = e.key === "ArrowRight" ? (i === last ? 0 : i + 1) : e.key === "ArrowLeft" ? (i === 0 ? last : i - 1) : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    document.getElementById(`tour-tab-${c.screens[next].id}`)?.focus();
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div role="tablist" aria-label={c.tabsLabel} className="flex flex-wrap gap-2">
          {c.screens.map((s, i) => (
            <button
              key={s.id}
              id={`tour-tab-${s.id}`}
              role="tab"
              type="button"
              aria-selected={i === active}
              aria-controls="tour-panel"
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onTabKey(e, i)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                i === active
                  ? "bg-primary text-white"
                  : "glass-fill-strong text-fg hover:text-primary",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <div role="group" aria-label={c.device.label} className="glass-fill-strong flex shrink-0 gap-1 self-start rounded-full p-1 md:self-auto">
          {(["desktop", "mobile"] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={device === d}
              onClick={() => setDevice(d)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors",
                device === d ? "bg-fg text-bg" : "text-fg-muted hover:text-fg",
              )}
            >
              {c.device[d]}
            </button>
          ))}
        </div>
      </div>

      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${screen.id}`}>
        <p className="body-lg mb-6 max-w-[640px] text-fg-muted">{screen.desc}</p>

        {device === "desktop" ? (
          <div className="glass-surface-strong mx-auto max-w-[1080px] overflow-hidden p-2">
            <div className="max-h-[640px] overflow-y-auto rounded-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={src}
                src={src}
                width={1440}
                height={DESKTOP_HEIGHT[screen.id]}
                alt={`${screen.label} — ${screen.desc}`}
                className="block h-auto w-full"
                loading="lazy"
              />
            </div>
          </div>
        ) : (
          <div className="mx-auto w-[300px] max-w-full rounded-[2.5rem] bg-hg-ink p-2.5 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={src}
              src={src}
              width={780}
              height={1688}
              alt={`${screen.label} — ${screen.desc}`}
              className="block h-auto w-full rounded-[2rem]"
              loading="lazy"
            />
          </div>
        )}

        <p className="mt-4 text-center text-sm text-fg-muted">{c.demoNote}</p>
      </div>
    </div>
  );
}
