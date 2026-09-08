"use client";

import { Lock } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/** Ícono neutro para badges sin arte definitivo (mismo path que usa el backend). */
export const BADGE_PLACEHOLDER_ICON = "/icons/badge-placeholder.svg";

export interface BadgeIconProps {
  /** `icon_url` del catálogo. Vacío o roto → placeholder. */
  iconUrl?: string | null;
  /** Nombre del badge — va al alt. */
  name: string;
  unlocked: boolean;
  /** Lado del ícono en px (el contenedor es un poco más grande). */
  size?: number;
  className?: string;
}

/**
 * Ícono de un badge, con el estado de desbloqueo encima.
 *
 * Punto único donde se resuelve el arte: hoy la mayoría del catálogo apunta al
 * placeholder, y cuando se suba el arte definitivo solo cambia el `icon_url` de
 * la fila — ni este componente ni sus callsites se tocan. Si la imagen falla en
 * runtime también cae al placeholder, para que nunca se vea una imagen rota.
 *
 * Se usa `<img>` y no `next/image` a propósito: las URLs vienen de la base y
 * pueden apuntar a un host externo cuando se cargue el arte definitivo.
 */
export function BadgeIcon({
  iconUrl,
  name,
  unlocked,
  size = 40,
  className,
}: BadgeIconProps) {
  const [failed, setFailed] = React.useState(false);
  const src = !iconUrl || failed ? BADGE_PLACEHOLDER_ICON : iconUrl;

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-card",
        !unlocked && "opacity-45 grayscale",
        className,
      )}
      style={{ height: size * 1.4, width: size * 1.4 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        style={{ height: size, width: "auto", maxWidth: size }}
        className="select-none object-contain"
        onError={() => setFailed(true)}
      />
      {!unlocked && (
        <Lock
          size={Math.max(12, Math.round(size * 0.35))}
          strokeWidth={2}
          className="absolute -bottom-1 -right-1 rounded-full bg-bg-raised p-0.5 text-fg-muted"
          aria-hidden
        />
      )}
    </span>
  );
}
