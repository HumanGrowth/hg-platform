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
  /** Persiste la cookie y recarga (re-monta server+client sobre el tema nuevo). */
  setTheme: (theme: HgTheme) => void;
  /** Cambio en caliente: persiste la cookie y actualiza <html data-theme> sin
   *  recargar. Para páginas sin server components dependientes del tema
   *  (marketing). */
  applyTheme: (theme: HgTheme) => void;
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
  applyTheme: defaultSetTheme,
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
  followSystem = false,
  children,
}: {
  initialTheme: HgTheme;
  /** Sin cookie `hg-theme` (el usuario nunca eligió): seguir la preferencia
   *  del sistema (prefers-color-scheme) y reaccionar a sus cambios. */
  followSystem?: boolean;
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = React.useState<HgTheme>(initialTheme);

  const setTheme = React.useCallback((next: HgTheme) => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }, []);

  const applyTheme = React.useCallback((next: HgTheme) => {
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    document.documentElement.dataset.theme = next;
    setThemeState(next);
  }, []);

  React.useEffect(() => {
    if (!followSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => {
      const next: HgTheme = mq.matches ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      setThemeState(next);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [followSystem]);

  const value = React.useMemo(
    () => ({ theme, setTheme, applyTheme }),
    [theme, setTheme, applyTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return React.useContext(ThemeContext);
}
