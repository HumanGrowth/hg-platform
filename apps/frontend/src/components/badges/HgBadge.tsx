"use client";

import * as React from "react";

import { badgeConfigForDimension } from "@/lib/badge-kit/dimension-adapter";
import { badgeSvgString, type BadgeState } from "@/lib/badge-kit";

export interface HgBadgeProps {
  /** Any dimension identifier the app uses (Drive code, career-path, or assessment code). */
  dimension: string;
  /** Level display name (e.g. "Sólido") — rendered on the banner. Prefer the real name from GET /me/progression. */
  level?: string;
  /** 0–6 rank pip value. See `levelBadgeMeta` in dimension-adapter.ts to derive this from a level_code. */
  rank?: number;
  state?: BadgeState;
  /** Width in px. */
  size?: number;
  compact?: boolean;
  className?: string;
}

/** Renders a single-pillar HG badge (dimension + level) as an inline SVG. */
export function HgBadge({
  dimension,
  level,
  rank,
  state = "earned",
  size = 96,
  compact = false,
  className,
}: HgBadgeProps) {
  const config = React.useMemo(() => badgeConfigForDimension(dimension), [dimension]);

  const svg = React.useMemo(
    () =>
      badgeSvgString({
        picto: config.picto,
        accent: config.accent,
        code: config.code,
        divName: config.name,
        title: level,
        rank,
        state,
        size,
        compact,
      }),
    [config, level, rank, state, size, compact],
  );

  const label = `${config.name}${level ? ` · ${level}` : ""} — ${
    state === "locked" ? "bloqueado" : "desbloqueado"
  }`;

  return (
    <span
      role="img"
      aria-label={label}
      className={className}
      // eslint-disable-next-line react/no-danger -- SVG comes from our own vendored kit, no user input reaches it unescaped.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
