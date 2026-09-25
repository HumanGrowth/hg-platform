"use client";

import { Lock } from "lucide-react";
import Image from "next/image";

import { HgBadge } from "@/components/badges/HgBadge";
import { resolveLevelBadge, resolvePillarBadge } from "@/lib/badge-kit/dimension-adapter";

/** Ícono genérico del catálogo (`icon_url` de las filas sin arte definitivo). */
const PLACEHOLDER_ICON = "/icons/badge-placeholder.svg";

export interface CatalogBadgeProps {
  code: string;
  name: string;
  /** `icon_url` del catálogo; solo se usa si trae arte real (no el placeholder). */
  iconUrl?: string | null;
  unlocked: boolean;
  size?: number;
}

/**
 * Arte de un badge del catálogo, siempre con el design system de badges
 * (`HgBadge`): niveles (`level-*`) y áreas (`pillar-*`) se dibujan con el picto
 * y el color de su dimensión. El `icon_url` genérico del catálogo NUNCA se
 * muestra: solo se respeta un ícono que traiga arte real (no el placeholder).
 * Un código sin convención conocida se dibuja igual con el kit, con la
 * dimensión inferida de su prefijo.
 */
export function CatalogBadge({ code, name, iconUrl, unlocked, size = 64 }: CatalogBadgeProps) {
  const state = unlocked ? "earned" : "locked";

  const level = resolveLevelBadge(code, name);
  if (level) {
    return (
      <HgBadge
        dimension={level.dimensionCode}
        level={level.levelTitle}
        rank={level.rank}
        state={state}
        size={size}
        compact
      />
    );
  }

  const pillar = resolvePillarBadge(code, name);
  if (pillar) {
    return (
      <HgBadge
        dimension={pillar.dimensionCode}
        level={pillar.areaName}
        state={state}
        size={size}
        compact
      />
    );
  }

  if (iconUrl && iconUrl !== PLACEHOLDER_ICON) {
    return (
      <span className="relative">
        <Image src={iconUrl} alt="" width={size} height={size} className="object-contain" />
        {!unlocked && (
          <Lock
            size={16}
            strokeWidth={2}
            className="absolute -bottom-1 -right-1 rounded-full bg-bg-raised p-0.5 text-fg-muted"
          />
        )}
      </span>
    );
  }

  // Sin arte propio: kit con la dimensión del prefijo del código ("cp-1" → CP).
  const prefix = /^([a-z]{2})-/i.exec(code)?.[1] ?? "cp";
  return <HgBadge dimension={prefix} level={name} state={state} size={size} compact />;
}
