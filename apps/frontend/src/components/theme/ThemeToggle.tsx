"use client";

import { Moon, Sun } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { useTheme } from "./ThemeProvider";

export interface ThemeToggleProps {
  className?: string;
  /** "inline" (switch + label, para toolbars como /perfil) o "menu-item"
   * (fila completa, para el dropdown del avatar). */
  variant?: "inline" | "menu-item";
}

/**
 * Switch glass claro / glass oscuro — la app es SIEMPRE glassmorphic, esto
 * solo elige la variante de color. Cambiar el tema persiste la cookie
 * `hg-theme` y recarga la app completa para re-render consistente en
 * server+client (ver ThemeProvider.setTheme).
 */
export function ThemeToggle({ className, variant = "inline" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? "Glass oscuro" : "Glass claro";

  const track = (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-fast ease-state",
        isDark ? "bg-primary" : "bg-bg-sunken",
      )}
    >
      <span
        className={cn(
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-fast ease-state",
          isDark ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </span>
  );

  if (variant === "menu-item") {
    return (
      <button
        type="button"
        role="menuitemcheckbox"
        aria-checked={isDark}
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 font-sans text-sm text-fg transition-colors",
          className,
        )}
      >
        {isDark ? (
          <Moon size={16} strokeWidth={1.75} aria-hidden />
        ) : (
          <Sun size={16} strokeWidth={1.75} aria-hidden />
        )}
        <span className="flex-1 text-left">{label}</span>
        {track}
      </button>
    );
  }

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 font-sans text-xs font-medium text-fg-muted",
        className,
      )}
    >
      {isDark ? (
        <Moon size={14} strokeWidth={1.75} aria-hidden className="text-primary" />
      ) : (
        <Sun size={14} strokeWidth={1.75} aria-hidden />
      )}
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Cambiar entre glass claro y glass oscuro"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber focus-visible:ring-offset-2"
      >
        {track}
      </button>
    </label>
  );
}
