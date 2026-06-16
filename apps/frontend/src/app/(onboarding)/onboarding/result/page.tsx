"use client";

import type { Route } from "next";
import Link from "next/link";

import { PILLAR_LABEL, Radar, type PillarCode, type RadarValues } from "@/components/radar/Radar";

// Valores mock: el scoring real lo provee el motor B2-02/B2-03.
const MOCK: RadarValues = { P1: 72, P2: 48, P3: 65, P4: 38, P5: 55, P6: 60 };

function lowestPillar(values: RadarValues): PillarCode {
  return (Object.entries(values) as [PillarCode, number][]).sort((a, b) => a[1] - b[1])[0][0];
}

export default function OnboardingResult() {
  const laggard = lowestPillar(MOCK);

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1000px] flex-col items-center justify-center px-6 py-16 text-center">
      <div className="eyebrow eyebrow-accent mb-6">Tu punto de partida</div>

      {/* state=complete + animateOnMount = se llena (filling) y queda completo. */}
      <Radar values={MOCK} state="complete" size="large" animateOnMount />

      <div className="mt-10 max-w-[560px] rounded-xl border border-border bg-cream-50 p-8">
        <h1 className="display text-ink-900 text-3xl">
          Tu dimensión más rezagada: {PILLAR_LABEL[laggard]}
        </h1>
        <p className="mt-3 text-ink-800">
          Es un gran lugar para empezar. Armamos una ruta inicial enfocada ahí.
        </p>
        <Link
          href={"/path" as Route}
          className="mt-6 inline-block rounded-md bg-orange px-8 py-4 font-sans text-base font-semibold text-white hover:bg-orange-600 transition-colors"
        >
          Empezar aquí →
        </Link>
      </div>

      <Link href={"/radar" as Route} className="mt-6 font-sans text-sm font-semibold text-orange-700">
        Ver todos los pilares
      </Link>
    </div>
  );
}
