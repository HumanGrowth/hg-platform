"use client";

import * as React from "react";

/**
 * La app es siempre glassmorphic — "light" (crema, el look original de la
 * exploración) y "dark" (fondo oscuro). No hay un tercer modo "classic"
 * plano: el toggle de usuario elige entre estas dos variantes de glass.
 */
export type HgTheme = "light" | "dark";

const THEME_COOKIE = "hg-theme";

interface ThemeContextValue {
  theme: HgTheme;
  setTheme: (theme: HgTheme) => void;
}

function defaultSetTheme(next: HgTheme) {
  document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  window.location.reload();
}

// Default "light" + no-op-ish setter: componentes que usan useTheme() fuera
// del RootLayout (unit tests, storybook-like renders) no explotan — se
// comportan como si el tema fuera light, igual que la app sin la cookie.
const ThemeContext = React.createContext<ThemeContextValue>({
  theme: "light",
  setTheme: defaultSetTheme,
});

/**
 * ThemeProvider mínimo. El valor inicial lo decide el server (RootLayout lee
 * la cookie `hg-theme` y setea data-theme en <html> antes del primer
 * render — sin flash). Este provider solo expone el toggle: cambiar de tema
 * persiste la cookie y hace un reload completo de la app para que TODOS los
 * server/client components re-mounten sobre el tema nuevo de forma
 * consistente.
 */
export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: HgTheme;
  children: React.ReactNode;
}) {
  const setTheme = React.useCallback((next: HgTheme) => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }, []);

  const value = React.useMemo(
    () => ({ theme: initialTheme, setTheme }),
    [initialTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return React.useContext(ThemeContext);
}
