"use client";

/* eslint-disable @next/next/no-img-element */
import type { Route } from "next";
import Link from "next/link";

import { useAuthStore } from "@/lib/auth-store";

export default function OnboardingWelcome() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      <img src="/brand/logo-color.svg" alt="Human Growth" className="mb-10 h-9 w-auto" />
      <h1 className="display max-w-[760px] text-ink-900 text-[40px] sm:text-[56px]">
        {firstName ? `Hola ${firstName}, vamos a descubrir tu punto de partida` : "Vamos a descubrir tu punto de partida"}
      </h1>
      <ul className="mt-8 flex flex-col gap-2 text-ink-800 sm:flex-row sm:gap-8">
        <li>6 situaciones reales</li>
        <li className="hidden sm:block" aria-hidden>·</li>
        <li>3 minutos</li>
        <li className="hidden sm:block" aria-hidden>·</li>
        <li>sin respuestas correctas</li>
      </ul>
      <Link
        href={"/onboarding/scenario/1" as Route}
        className="mt-12 rounded-md bg-orange px-8 py-4 font-sans text-base font-semibold text-white hover:bg-orange-600 transition-colors"
      >
        Empezar →
      </Link>
    </div>
  );
}
