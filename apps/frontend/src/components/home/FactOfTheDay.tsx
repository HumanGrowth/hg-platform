"use client";

import { Sparkles } from "lucide-react";
import * as React from "react";

interface Fact {
  text: string;
  source?: string;
}

/** Índice del día del año (para elegir el fact del día de forma determinista). */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - start.getTime()) / 86_400_000);
}

/**
 * "Fact del día" — tarjeta destacada al inicio de /home. Consume `/facts.json`
 * (hoy dummy; se reemplaza por los facts generados por HG). Elige uno por día de
 * forma determinista. Gradiente de marca + orbes flotando + barrido de brillo
 * (respeta `prefers-reduced-motion`).
 */
export function FactOfTheDay() {
  const [fact, setFact] = React.useState<Fact | null>(null);

  React.useEffect(() => {
    let alive = true;
    fetch("/facts.json")
      .then((r) => r.json())
      .then((data: { facts?: Fact[] }) => {
        const facts = data.facts ?? [];
        if (alive && facts.length > 0) {
          setFact(facts[dayOfYear(new Date()) % facts.length]);
        }
      })
      .catch(() => {
        /* sin fact → no renderiza nada */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!fact) return null;

  return (
    <section
      aria-label="Fact del día"
      className="motion-safe:animate-fade-up relative mt-8 overflow-hidden rounded-2xl border border-hg-green-700/40 bg-gradient-to-br from-hg-ink via-hg-green-700 to-hg-green p-6 text-hg-cream shadow-md sm:p-8"
    >
      {/* Orbes decorativos flotando. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-hg-amber/25 blur-2xl motion-safe:animate-float"
      />
      <span
        aria-hidden
        style={{ animationDelay: "1.6s" }}
        className="pointer-events-none absolute -bottom-14 left-12 h-32 w-32 rounded-full bg-hg-gold/20 blur-2xl motion-safe:animate-float"
      />
      {/* Barrido de brillo diagonal. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent motion-safe:animate-shimmer"
      />

      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-sans text-micro font-semibold uppercase tracking-meta">
          <Sparkles size={14} strokeWidth={2} className="text-hg-amber" />
          Fact del día
        </div>
        <p className="mt-4 max-w-2xl text-balance font-display text-xl leading-snug sm:text-2xl">
          {fact.text}
        </p>
        {fact.source ? (
          <p className="mt-3 font-sans text-xs text-hg-cream/70">— {fact.source}</p>
        ) : null}
      </div>
    </section>
  );
}
