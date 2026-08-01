"use client";

import type { Route } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Módulo introductorio (Release TASK 6) — placeholder: mensaje de bienvenida +
// botones a Módulos / Inicio. Sin metáfora de pilar (no pertenece a ninguna
// dimensión): identidad de marca HG (círculo verde + círculo amber).
export default function IntroModulePage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col items-center justify-center gap-6 px-8 py-16 text-center">
      <div className="flex items-center gap-2" aria-hidden>
        <span className="h-9 w-9 rounded-full bg-primary" />
        <span className="-ml-3 h-9 w-9 rounded-full bg-hg-amber" />
      </div>
      <h1 className="font-display text-4xl leading-tight text-fg">Bienvenida a HumanGrowth</h1>
      <p className="max-w-md text-md text-fg-muted">
        Este espacio es tu punto de partida para explorar tus 6 dimensiones. Cuando quieras,
        arrancá con los módulos o volvé a tu inicio.
      </p>
      <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link href={"/modulos" as Route} className={cn(buttonVariants({ size: "lg" }))}>
          Ir a Módulos
        </Link>
        <Link
          href={"/home" as Route}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
        >
          Ir a Inicio
        </Link>
      </div>
    </main>
  );
}
