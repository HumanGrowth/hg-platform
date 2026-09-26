"use client";

import { Moon, Sun } from "lucide-react";

import { useTheme } from "@/components/theme/ThemeProvider";

/**
 * Toggle claro/oscuro del sitio público. El valor inicial sigue al sistema
 * (prefers-color-scheme) hasta que la persona elige; al elegir se guarda la
 * cookie `hg-theme` (misma que usa la app) y el cambio es en caliente.
 */
export function MarketingThemeToggle({ className = "" }: { className?: string }) {
  const { theme, applyTheme } = useTheme();
  const isDark = theme === "dark";
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? "Cambiar a tema claro" : "Cambiar a tema oscuro";

  return (
    <button
      type="button"
      onClick={() => applyTheme(isDark ? "light" : "dark")}
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-full text-fg transition-colors hover:bg-fg/10 ${className}`}
    >
      <Icon size={18} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
