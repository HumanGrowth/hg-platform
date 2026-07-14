"use client";

import * as React from "react";

/**
 * No existía en el codebase (grep confirmado antes de TASK B-05) — se creó
 * acá porque es donde el prompt introduce el layout switcher mobile/desktop
 * de `/modulos/[slug]` (aunque el wiring real de esa página es B-08).
 * SSR-safe: devuelve `false` hasta el primer paint en cliente (evita
 * hydration mismatch), luego sincroniza con `matchMedia`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
