"use client";

/* eslint-disable @next/next/no-img-element */
import { useRouter } from "next/navigation";
import * as React from "react";

import { apiStartSession } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";

export default function OnboardingWelcome() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const firstName = user?.full_name.split(" ")[0] ?? "";
  const [loading, setLoading] = React.useState(false);

  async function start() {
    setLoading(true);
    try {
      const session = await apiStartSession({ kind: "onboarding_short" });
      router.push(`/onboarding/session/${session.id}`);
    } catch {
      toast("No pudimos iniciar tu evaluación. Probá de nuevo.", "danger");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <img src="/brand/logo-positive.png" alt="Human Growth" className="mb-10 h-9 w-auto" />
      <h1 className="display max-w-[760px] text-ink-900 text-[40px] sm:text-[56px]">
        {firstName
          ? `Hola ${firstName}, vamos a entender tu punto de partida`
          : "Vamos a entender tu punto de partida"}
      </h1>
      <p className="mt-6 max-w-prose text-ink-800">
        18 preguntas cortas sobre tus 6 dimensiones. No hay respuestas correctas.
      </p>
      <ul className="mt-6 flex flex-col gap-2 text-ink-800 sm:flex-row sm:gap-8">
        <li>6 dimensiones</li>
        <li className="hidden sm:block" aria-hidden>·</li>
        <li>~5-6 minutos</li>
        <li className="hidden sm:block" aria-hidden>·</li>
        <li>resultado inmediato</li>
      </ul>
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="mt-12 rounded-md bg-orange px-8 py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
      >
        {loading ? "Preparando…" : "Empezar →"}
      </button>
    </div>
  );
}
