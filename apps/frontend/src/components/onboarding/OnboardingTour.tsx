"use client";

import { ArrowLeft, ArrowRight, Calendar, Compass, Home, Sparkles, User, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
}

/**
 * Tour de onboarding post-primer-login (Release TASK 6). Carrusel de pasos en un
 * modal centrado (robusto en mobile, sin anclar a elementos que se muevan).
 * `onDone("finish")` → arrancar el módulo intro; `onDone("skip")` → cerrar.
 */
export function OnboardingTour({
  userName,
  onDone,
}: {
  userName: string;
  onDone: (action: "finish" | "skip") => void;
}) {
  const steps: Step[] = React.useMemo(
    () => [
      {
        icon: Sparkles,
        title: userName ? `Bienvenida, ${userName}` : "Bienvenida",
        body: "Te mostramos cómo funciona HumanGrowth en 30 segundos.",
      },
      {
        icon: Home,
        title: "Tus 6 dimensiones",
        body: "En Inicio ves tus 6 dimensiones. Tocá cualquiera para ver tu progreso.",
      },
      {
        icon: Sparkles,
        title: "Módulos",
        body: "Acá vas a encontrar todos los contenidos de aprendizaje.",
      },
      {
        icon: Compass,
        title: "Tu radar",
        body: "Tu foto completa: cómo estás en las 6 dimensiones y cómo evolucionás.",
      },
      {
        icon: User,
        title: "Mi Perfil",
        body: "Tus badges, tu historial de reevaluaciones y tu progreso detallado.",
      },
      {
        icon: Calendar,
        title: "Eventos",
        body: "Webinars, sesiones en vivo y material extra para seguir creciendo.",
      },
    ],
    [userName],
  );

  const [i, setI] = React.useState(0);
  const isLast = i === steps.length - 1;
  const step = steps[i];
  const Icon = step.icon;

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tour de bienvenida"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 motion-safe:animate-fade-in"
      onClick={() => onDone("skip")}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-bg-raised p-6 text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Saltar tour"
          onClick={() => onDone("skip")}
          className="absolute right-3 top-3 rounded-md p-1.5 text-fg-muted hover:bg-bg-sunken hover:text-fg"
        >
          <X size={18} strokeWidth={2} />
        </button>

        <div
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-primary"
          style={{ background: "color-mix(in srgb, var(--hg-primary) 12%, transparent)" }}
        >
          <Icon size={30} strokeWidth={1.75} aria-hidden />
        </div>
        <h2 className="mt-4 font-display text-2xl leading-tight text-fg">{step.title}</h2>
        <p className="mt-2 text-sm text-fg-muted">{step.body}</p>

        <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, idx) => (
            <span
              key={idx}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === i ? "w-5 bg-primary" : "w-1.5 bg-border-strong",
              )}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {i > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => setI((v) => v - 1)}>
              <ArrowLeft size={16} strokeWidth={1.75} />
              Atrás
            </Button>
          ) : (
            <button
              type="button"
              onClick={() => onDone("skip")}
              className="font-sans text-sm font-medium text-fg-muted hover:text-fg"
            >
              Saltar
            </button>
          )}
          {isLast ? (
            <Button
              size="sm"
              onClick={() => onDone("finish")}
              className="h-auto min-h-[44px] whitespace-normal py-2 text-center leading-tight"
            >
              Comenzar mi primer módulo
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setI((v) => v + 1)}>
              Siguiente
              <ArrowRight size={16} strokeWidth={1.75} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
