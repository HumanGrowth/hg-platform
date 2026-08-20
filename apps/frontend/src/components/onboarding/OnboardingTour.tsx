"use client";

import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ClipboardList,
  Compass,
  Home,
  Sparkles,
  User,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Step {
  icon: LucideIcon;
  title: string;
  body: string;
  /** Elemento a destacar con el spotlight (data-tour-id). Sin él → card centrado. */
  targetId?: string;
}

const PAD = 8; // padding del spotlight alrededor del elemento
const CARD_W = 340;

interface Spot {
  top: number;
  left: number;
  width: number;
  height: number;
  cardTop: number;
  cardLeft: number;
  /** Dónde se ancla la tarjeta respecto del elemento destacado. */
  placement: "right" | "left" | "above" | "below";
}

/**
 * Tour de onboarding post-primer-login con SPOTLIGHT (cierre-beta TASK 7).
 * Oscurece la pantalla y recorta un hueco animado sobre el elemento destacado
 * (data-tour-id), con un tooltip al lado. Si el elemento no existe (ej. un ítem
 * que este user no ve, o en mobile donde vive en el drawer), el paso cae a un
 * card centrado — no se rompe ni desaparece. Respeta prefers-reduced-motion
 * (el pulso se desactiva globalmente en globals.css).
 */
export function OnboardingTour({
  userName,
  onDone,
}: {
  userName: string;
  onDone: (action: "finish" | "skip") => void;
}) {
  // Orden = orden del menú, uno por uno sin saltar:
  // Inicio → Mi Ruta → Módulos → Plan de Acción → Eventos → Mi Perfil.
  const steps: Step[] = React.useMemo(
    () => [
      {
        icon: Sparkles,
        title: userName ? `Te damos la bienvenida, ${userName}` : "Te damos la bienvenida",
        body: "Te mostramos cómo funciona HumanGrowth en 30 segundos.",
      },
      { icon: Home, title: "Inicio", body: "Tu resumen: las 6 dimensiones y tu progreso de un vistazo.", targetId: "nav-home" },
      { icon: Compass, title: "Mi Ruta", body: "Tu próximo paso recomendado y tu recorrido, en el orden que más te sirve.", targetId: "nav-path" },
      { icon: Sparkles, title: "Módulos", body: "Acá vas a encontrar todos los contenidos de aprendizaje.", targetId: "nav-modulos" },
      { icon: ClipboardList, title: "Plan de Acción", body: "Tus tips guardados y los próximos pasos que te propusiste.", targetId: "nav-plan-accion" },
      { icon: Calendar, title: "Eventos", body: "Webinars, sesiones en vivo y material extra para seguir creciendo.", targetId: "nav-eventos" },
      { icon: User, title: "Mi Perfil", body: "Tus badges, tu radar y tu historial de reevaluaciones.", targetId: "nav-perfil" },
    ],
    [userName],
  );

  const [i, setI] = React.useState(0);
  const [spot, setSpot] = React.useState<Spot | null>(null);
  const isLast = i === steps.length - 1;
  const step = steps[i];
  const Icon = step.icon;

  // Medir/posicionar el spotlight cada vez que cambia el paso (o en resize/scroll).
  React.useLayoutEffect(() => {
    const measure = () => {
      const target = step.targetId
        ? (document.querySelector(`[data-tour-id="${step.targetId}"]`) as HTMLElement | null)
        : null;
      if (!target) {
        setSpot(null);
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      const r = target.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const top = r.top - PAD;
      const left = r.left - PAD;
      const width = r.width + PAD * 2;
      const height = r.height + PAD * 2;
      const GAP = 16;
      const midY = r.top + r.height / 2;
      let placement: Spot["placement"];
      let cardTop: number;
      let cardLeft: number;
      if (r.right + GAP + CARD_W <= vw) {
        // Al LADO (derecha) — caso desktop con el nav en el sidebar izquierdo.
        placement = "right";
        cardLeft = r.right + GAP;
        cardTop = midY; // centrado vertical vía translateY(-50%)
      } else if (r.left - GAP - CARD_W >= 0) {
        // Al lado (izquierda) si no hay lugar a la derecha.
        placement = "left";
        cardLeft = r.left - GAP;
        cardTop = midY;
      } else {
        // Fallback vertical (mobile: nav abajo → tarjeta arriba).
        placement = midY < vh / 2 ? "below" : "above";
        cardLeft = Math.min(Math.max(r.left + r.width / 2 - CARD_W / 2, 12), vw - CARD_W - 12);
        cardTop = placement === "below" ? top + height + 12 : top - 12;
      }
      setSpot({ top, left, width, height, cardTop, cardLeft, placement });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [i, step.targetId]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone("skip");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tour de bienvenida"
      className="pointer-events-auto w-[340px] max-w-[calc(100vw-24px)] rounded-2xl bg-bg-raised p-6 text-center shadow-xl motion-safe:animate-fade-in"
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
        className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-primary"
        style={{ background: "color-mix(in srgb, var(--hg-primary) 12%, transparent)" }}
      >
        <Icon size={28} strokeWidth={1.75} aria-hidden />
      </div>
      <h2 className="mt-4 font-display text-2xl leading-tight text-fg">{step.title}</h2>
      <p className="mt-2 text-sm text-fg-muted">{step.body}</p>

      <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
        {steps.map((_, idx) => (
          <span
            key={idx}
            className={cn("h-1.5 rounded-full transition-all", idx === i ? "w-5 bg-primary" : "w-1.5 bg-border-strong")}
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
  );

  // Con spotlight: overlay recortado + anillo pulsante + card anclado al elemento.
  if (spot) {
    return (
      <div className="fixed inset-0 z-[60]" onClick={() => onDone("skip")}>
        {/* Overlay oscuro con hueco (box-shadow gigante) sobre el elemento. */}
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[10px] transition-all duration-300"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)",
          }}
        />
        {/* Anillo pulsante alrededor del hueco. */}
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-[10px] transition-all duration-300 motion-safe:animate-pulse"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 3px var(--hg-primary), 0 0 20px rgba(74,122,84,0.6)",
          }}
        />
        {/* Card del paso, anclado cerca del elemento. */}
        <div
          className="fixed"
          style={{
            top: spot.cardTop,
            left: spot.cardLeft,
            transform:
              spot.placement === "right"
                ? "translateY(-50%)"
                : spot.placement === "left"
                  ? "translate(-100%, -50%)"
                  : spot.placement === "above"
                    ? "translateY(-100%)"
                    : undefined,
          }}
        >
          <div className="relative">{card}</div>
        </div>
      </div>
    );
  }

  // Sin target (bienvenida, o elemento ausente): card centrado sobre overlay.
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 motion-safe:animate-fade-in"
      onClick={() => onDone("skip")}
    >
      <div className="relative">{card}</div>
    </div>
  );
}
