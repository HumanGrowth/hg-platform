"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { EmptyRing } from "@/components/EmptyRing";
import { MiniRadar } from "@/components/radar/MiniRadar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/auth-store";
import { PILLARS } from "@/lib/pillars";

export default function HomePage() {
  const user = useAuthStore((s) => s.user);
  const firstName = user?.full_name.split(" ")[0] ?? "";

  return (
    <main className="mx-auto w-full max-w-app px-6 py-10">
      {/* Hero */}
      <Eyebrow accent>Progreso general</Eyebrow>
      <Display variant="display-2" className="mt-2">
        {firstName ? `Hola, ${firstName}` : "Hola"}
      </Display>
      <p className="mt-3 max-w-prose text-md text-fg-muted">
        Acá está tu crecimiento, dimensión por dimensión. Elegí una y seguí.
      </p>

      {/* Próximo paso */}
      <Card className="mt-8 flex flex-col items-start gap-4 bg-bg-raised sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Eyebrow>Tu próximo paso</Eyebrow>
          <h2 className="mt-1 font-sans text-xl font-semibold text-fg">
            Empezá por tu evaluación inicial
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            5 min · define tu punto de partida en las 6 dimensiones.
          </p>
        </div>
        <Button size="lg" className="shrink-0">
          Continuar
          <ArrowRight size={18} strokeWidth={1.75} />
        </Button>
      </Card>

      {/* Mini radar */}
      <Card className="mt-4 flex items-center gap-5 bg-bg-raised">
        <MiniRadar values={{ P1: 72, P2: 48, P3: 65, P4: 38, P5: 55, P6: 60 }} />
        <div>
          <Eyebrow>Tu radar</Eyebrow>
          <h2 className="mt-1 font-sans text-lg font-semibold text-fg">Vista rápida</h2>
          <Link
            href={"/radar" as Route}
            className="mt-1 inline-flex items-center gap-1 font-sans text-sm font-semibold text-orange-700"
          >
            Ver radar completo
            <ArrowRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      </Card>

      {/* 6 dimensiones */}
      <section className="mt-12">
        <Eyebrow>Tus 6 dimensiones</Eyebrow>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p) => (
            <Card key={p.id} className="flex flex-col gap-4 bg-cream-50">
              <div className="flex items-center justify-between">
                <Badge variant={p.badge}>{p.id}</Badge>
                <span className={`h-2 w-2 rounded-full ${p.dot}`} aria-hidden />
              </div>
              <h3 className="font-sans text-md font-semibold text-fg">{p.name}</h3>
              <div className="mt-auto">
                <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
                  <span>Progreso</span>
                  <span className="font-mono">0%</span>
                </div>
                <Progress value={0} label={`Progreso ${p.name}`} />
              </div>
              <Button variant="ghost" size="sm" className="self-start px-0 hover:bg-transparent">
                Explorar
                <ArrowRight size={16} strokeWidth={1.75} />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Actividad reciente */}
      <section className="mt-12">
        <Eyebrow>Actividad reciente</Eyebrow>
        <Card className="mt-4 flex items-center justify-center py-16">
          <EmptyRing label="Sin actividad aún. Comenzá explorando un pilar." />
        </Card>
      </section>

      <p className="mt-10 text-xs text-fg-subtle">
        ¿Sos admin de tu organización?{" "}
        <Link href={"/profile" as Route} className="underline underline-offset-2">
          Mirá tu perfil
        </Link>
        .
      </p>
    </main>
  );
}
