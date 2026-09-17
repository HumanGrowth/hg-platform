"use client";

import { ChevronLeft, ChevronRight, Lock, Trophy } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { HgBadge } from "@/components/badges/HgBadge";
import { Card } from "@/components/ui/card";
import { apiGetMyBadges } from "@/lib/api";
import { resolveLevelBadge } from "@/lib/badge-kit/dimension-adapter";
import type { MyBadge } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Carrusel de badges (Sprint Tarde · TASK 4). Scroll horizontal touch-friendly
 * en mobile + flechas en desktop. Badge bloqueado = grayscale + opacity; al tap,
 * modal con el detalle. Esquema genérico: el catálogo lo define Andy después
 * (hoy el endpoint puede devolver []), por eso el estado vacío es de primera clase.
 */
export function BadgesCarousel() {
  const [badges, setBadges] = React.useState<MyBadge[] | null>(null);
  const [status, setStatus] = React.useState<"loading" | "error" | "ok">("loading");
  const [selected, setSelected] = React.useState<MyBadge | null>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const b = await apiGetMyBadges();
        if (alive) setBadges(b);
      } catch {
        // Sin catálogo/endpoint todavía → tratamos como "sin badges" (vacío).
        if (alive) setBadges([]);
      } finally {
        if (alive) setStatus("ok");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function scrollBy(dir: -1 | 1) {
    scrollerRef.current?.scrollBy({ left: dir * 240, behavior: "smooth" });
  }

  if (status === "loading") {
    return <Card className="mt-4 h-40 animate-pulse bg-bg-sunken" />;
  }

  if (!badges || badges.length === 0) {
    return (
      <Card className="mt-4 flex flex-col items-center gap-2 py-10 text-center">
        <Trophy size={28} strokeWidth={1.5} className="text-fg-subtle" aria-hidden />
        <p className="text-sm text-fg-muted">Todavía no desbloqueaste badges.</p>
        <p className="max-w-xs text-xs text-fg-subtle">
          A medida que completes unidades y reevalúes tus dimensiones, vas a ir sumando logros acá.
        </p>
      </Card>
    );
  }

  return (
    <>
      <div className="relative mt-4">
        <button
          type="button"
          aria-label="Ver badges anteriores"
          onClick={() => scrollBy(-1)}
          className="glass-fill-strong absolute -left-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-bg-raised p-1.5 text-fg-muted shadow-sm hover:text-fg sm:block"
        >
          <ChevronLeft size={18} strokeWidth={2} />
        </button>
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {badges.map((badge) => (
            <button
              key={badge.code}
              type="button"
              onClick={() => setSelected(badge)}
              className="flex w-28 shrink-0 snap-start flex-col items-center gap-2 focus-visible:outline-none"
            >
              <div
                className={cn(
                  "glass-fill-strong flex h-24 w-24 items-center justify-center rounded-full border border-border bg-surface-card transition-transform hover:scale-105",
                  !badge.unlocked && "opacity-40 grayscale",
                )}
              >
                <BadgeArt badge={badge} size={64} />
              </div>
              <span className="line-clamp-2 text-center text-xs font-medium text-fg">
                {badge.name}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-label="Ver más badges"
          onClick={() => scrollBy(1)}
          className="glass-fill-strong absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 rounded-full border border-border bg-bg-raised p-1.5 text-fg-muted shadow-sm hover:text-fg sm:block"
        >
          <ChevronRight size={18} strokeWidth={2} />
        </button>
      </div>

      {selected && <BadgeModal badge={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/**
 * Resuelve el arte de un badge: si el `code` es un badge de nivel de dimensión
 * (convención `level-<dim>-<levelcode>` del backend), renderiza el <HgBadge>
 * dinámico; si no, cae al ícono/placeholder del catálogo (arte sin
 * dimensión mapeable — comportamiento previo, sin cambios).
 */
function BadgeArt({ badge, size }: { badge: MyBadge; size: number }) {
  const resolved = resolveLevelBadge(badge.code, badge.name);
  if (resolved) {
    return (
      <HgBadge
        dimension={resolved.dimensionCode}
        level={resolved.levelTitle}
        rank={resolved.rank}
        state={badge.unlocked ? "earned" : "locked"}
        size={size}
        compact
      />
    );
  }

  return (
    <span className="relative">
      <Image src={badge.icon_url} alt="" width={size} height={size} className="object-contain" />
      {!badge.unlocked && (
        <Lock
          size={16}
          strokeWidth={2}
          className="absolute -bottom-1 -right-1 rounded-full bg-bg-raised p-0.5 text-fg-muted"
        />
      )}
    </span>
  );
}

function BadgeModal({ badge, onClose }: { badge: MyBadge; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={badge.name}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6"
      onClick={onClose}
    >
      <Card
        className="flex w-full max-w-xs flex-col items-center gap-3 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "glass-fill-strong flex h-24 w-24 items-center justify-center rounded-full border border-border bg-surface-card",
            !badge.unlocked && "opacity-40 grayscale",
          )}
        >
          <BadgeArt badge={badge} size={64} />
        </div>
        <h3 className="font-sans text-lg font-semibold text-fg">{badge.name}</h3>
        <p className="text-sm text-fg-muted">{badge.description}</p>
        {badge.unlocked ? (
          <p className="text-xs font-semibold text-success">
            Desbloqueado
            {badge.unlocked_at
              ? ` · ${new Date(badge.unlocked_at).toLocaleDateString("es", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}`
              : ""}
          </p>
        ) : (
          <p className="text-xs text-fg-subtle">{badge.unlock_hint}</p>
        )}
      </Card>
    </div>
  );
}
