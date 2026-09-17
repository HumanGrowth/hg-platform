"use client";

import * as React from "react";

import { customPathBadgeSvgString } from "@/lib/badge-kit/custom-path-badge";

export interface CustomPathBadgePreviewProps {
  routeName: string;
  companyName: string;
  /** Pillar identifiers (any format `badgeConfigForDimension` accepts). */
  pillars: string[];
  size?: number;
  className?: string;
}

const DEBOUNCE_MS = 200;

/**
 * Live preview of the multi-pillar custom-path badge, for the (not yet built)
 * CustomPath creation form — Área 2 · FASE 2.3. Debounced so fast typing in
 * the route-name/company-name inputs doesn't re-render the SVG on every
 * keystroke.
 *
 * TODO(Área 2 · FASE 2.3): mount this next to the route-name/company-name
 * inputs once the CustomPath creation form exists; today it's only wired into
 * `app/%5Fshowcase/badges` (/_showcase/badges).
 */
export function CustomPathBadgePreview({
  routeName,
  companyName,
  pillars,
  size = 140,
  className,
}: CustomPathBadgePreviewProps) {
  const [debounced, setDebounced] = React.useState({ routeName, companyName, pillars });

  React.useEffect(() => {
    const id = setTimeout(() => setDebounced({ routeName, companyName, pillars }), DEBOUNCE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pillars is a fresh array each render; compare by content via the join below.
  }, [routeName, companyName, pillars.join(",")]);

  const svg = React.useMemo(
    () =>
      customPathBadgeSvgString({
        routeName: debounced.routeName || "Ruta personalizada",
        companyName: debounced.companyName || "",
        pillars: debounced.pillars,
        size,
      }),
    [debounced, size],
  );

  const label = `Ruta ${debounced.routeName || "personalizada"} — ${debounced.pillars.length} pilares`;

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
