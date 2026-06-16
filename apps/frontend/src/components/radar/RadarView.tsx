"use client";

import Link from "next/link";

import { PILLARS } from "@/lib/pillars";

import { PILLAR_LABEL, Radar, type PillarCode, type RadarValues } from "./Radar";

// Valores mock hasta que el motor de assessment (B2-02/B2-03) los provea.
const MOCK: RadarValues = { P1: 72, P2: 48, P3: 65, P4: 38, P5: 55, P6: 60 };

export function RadarView({
  values = MOCK,
  completed = true,
}: {
  values?: RadarValues;
  completed?: boolean;
}) {
  if (!completed) {
    return (
      <div className="flex flex-col items-center gap-6 py-10 text-center">
        <Radar values={{}} state="empty" size="large" />
        <div>
          <p className="mb-4 max-w-prose text-fg-muted">
            Todavía no completaste tu diagnóstico. Hacé el assessment para ver tu radar.
          </p>
          <Link
            href={"/onboarding/welcome" as never}
            className="inline-block rounded-md bg-orange px-6 py-3 font-sans text-sm font-semibold text-white hover:bg-orange-600"
          >
            Hacer assessment →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center">
      <div className="mx-auto lg:mx-0">
        <Radar values={values} state="complete" size="large" interactive animateOnMount />
      </div>
      <ul className="flex w-full max-w-sm flex-col gap-2">
        {PILLARS.map((p) => {
          const code = p.id as PillarCode;
          const v = values[code] ?? 0;
          return (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-bg-raised px-4 py-3"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${p.dot}`} />
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm font-semibold text-fg">{PILLAR_LABEL[code]}</p>
                <p className="font-sans text-xs text-fg-muted">{v} / 100</p>
              </div>
              <Link
                href={`/radar/${code}` as never}
                className="font-sans text-xs font-semibold text-orange-700"
              >
                Ver detalle
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
