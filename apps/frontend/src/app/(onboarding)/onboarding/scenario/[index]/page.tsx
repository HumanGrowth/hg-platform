"use client";

import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";

import { SCENARIOS, TOTAL_SCENARIOS, useOnboardingStore } from "@/lib/onboarding-store";

export default function ScenarioPage() {
  const router = useRouter();
  const params = useParams<{ index: string }>();
  const setAnswer = useOnboardingStore((s) => s.setAnswer);

  const index = Number(params.index);
  const valid = Number.isInteger(index) && index >= 1 && index <= TOTAL_SCENARIOS;
  if (!valid) {
    // Índice fuera de rango: volver al inicio del flujo.
    if (typeof window !== "undefined") router.replace("/onboarding/welcome" as Route);
    return null;
  }

  const scenario = SCENARIOS[index - 1];

  function choose(optionId: string) {
    setAnswer(index, optionId);
    if (index >= TOTAL_SCENARIOS) {
      router.push("/onboarding/result" as Route);
    } else {
      router.push(`/onboarding/scenario/${index + 1}` as Route);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[1100px] flex-col px-6 py-10">
      <div className="eyebrow eyebrow-accent">
        Situación {index} de {TOTAL_SCENARIOS}
      </div>
      {/* Barra de progreso */}
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full bg-orange transition-[width] duration-300"
          style={{ width: `${(index / TOTAL_SCENARIOS) * 100}%` }}
        />
      </div>

      <div className="mt-12 grid flex-1 grid-cols-1 items-center gap-10 lg:grid-cols-2">
        <div>
          <h1 className="display text-ink-900 text-[32px] sm:text-[44px]">{scenario.prompt}</h1>
          <div className="mt-8 flex flex-col gap-3">
            {scenario.options.map((opt) => (
              <button
                key={opt.id}
                onClick={() => choose(opt.id)}
                className="rounded-lg border border-border bg-cream-50 px-6 py-5 text-left font-sans text-base text-ink-900 transition-colors hover:border-orange hover:bg-orange-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Ilustración placeholder */}
        <div className="hidden aspect-[4/3] items-center justify-center rounded-xl border border-border bg-cream-200 lg:flex">
          <span className="font-mono text-sm text-fg-subtle">[ ilustración {index} ]</span>
        </div>
      </div>
    </div>
  );
}
