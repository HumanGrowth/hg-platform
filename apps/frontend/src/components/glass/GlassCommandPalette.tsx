"use client";

import { Check, Search, Sparkles } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as React from "react";

import { sideNavItemsForRole } from "@/components/nav/items";
import { useTheme } from "@/components/theme/ThemeProvider";
import { useAuthStore } from "@/lib/auth-store";
import { OPEN_COMMAND_PALETTE_EVENT } from "@/lib/glass/command-palette-bus";
import { cn } from "@/lib/utils";

/**
 * GlassCommandPalette (Sprint Glass · fase 2). Referencia visual:
 * HG/Artifacts/Renovación glassmorphic HG/GlassCommandPalette.dc.html —
 * runtime propio en React, no se porta el runtime del .dc.html.
 *
 * Cmd/Ctrl+K abre un modal glass profundo con navegación real (reusa
 * sideNavItemsForRole, mismos destinos que SideNav/BottomNav) + comandos de
 * IA en lenguaje natural MOCK (sin lógica real — solo el estado "pensando"
 * y un resultado de muestra). 100% detrás del flag: fuera del tema glass
 * este componente no renderiza nada, ni ata el listener de teclado.
 */

const AI_SUGGESTIONS = [
  "Resumen del engagement de esta semana",
  "¿Quién está en riesgo de baja actividad?",
  "Proponeme un plan de repaso para hoy",
  "Comparar mi dimensión Propósito con el mes pasado",
];

type Row =
  | { kind: "interpret"; label: string; sub: string }
  | { kind: "ai"; label: string; sub: string }
  | { kind: "nav"; label: string; sub: string; href: string };

type Phase = "browse" | "thinking" | "done";

const MOCK_RESULT = {
  summary: "Listo. Preparé una vista con los resultados de tu pedido y la organicé en tarjetas de cristal.",
  rows: [
    { title: "Resumen generado", meta: "Insight principal destacado", tag: "Nuevo", color: "var(--hg-green)" },
    { title: "Comparativa por equipo", meta: "Vista lista para revisar", tag: "Vista", color: "var(--hg-slate)" },
    { title: "Recomendación de IA", meta: "Próximo paso sugerido", tag: "IA", color: "var(--hg-amber)" },
  ],
};

export function GlassCommandPalette() {
  const { theme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const [phase, setPhase] = React.useState<Phase>("browse");
  const [interpreted, setInterpreted] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout>>();

  const navItems = React.useMemo(() => sideNavItemsForRole(user), [user]);

  const close = React.useCallback(() => {
    setOpen(false);
    setPhase("browse");
    setQuery("");
    setActive(0);
  }, []);

  React.useEffect(() => {
    if (theme !== "dark") return undefined;
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        close();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [theme, close]);

  // Trigger externo (ej. botón ⌘K del dock de SpatialCanvas).
  React.useEffect(() => {
    if (theme !== "dark") return undefined;
    function onOpenRequest() {
      setOpen(true);
    }
    document.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
    return () => document.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpenRequest);
  }, [theme]);

  React.useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [open]);

  React.useEffect(() => () => clearTimeout(timerRef.current), []);

  // Fuera del tema glass: cero DOM, cero listeners.
  if (theme !== "dark") return null;

  const q = query.trim().toLowerCase();
  const rows: Row[] = [];
  if (query.trim().length > 0) {
    rows.push({ kind: "interpret", label: query.trim(), sub: "Interpretar y ejecutar con IA" });
  }
  AI_SUGGESTIONS.filter((a) => !q || a.toLowerCase().includes(q)).forEach((a) =>
    rows.push({ kind: "ai", label: a, sub: "Comando de IA" }),
  );
  navItems
    .filter((n) => !q || n.label.toLowerCase().includes(q))
    .forEach((n) => rows.push({ kind: "nav", label: n.label, sub: "Navegación", href: n.href }));

  function run(row: Row, idx: number) {
    setActive(idx);
    if (row.kind === "nav") {
      close();
      router.push(row.href as Route);
      return;
    }
    setInterpreted(row.label);
    setPhase("thinking");
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setPhase("done"), 1400);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((v) => Math.min(v + 1, Math.max(rows.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((v) => Math.max(v - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = rows[active];
      if (row) run(row, active);
    }
  }

  const groups: { label: string; items: { row: Row; i: number }[] }[] = [];
  const byKind = (kind: Row["kind"]) => rows.map((row, i) => ({ row, i })).filter(({ row: r }) => r.kind === kind);
  const interpretRows = byKind("interpret");
  const aiRows = byKind("ai");
  const navRows = byKind("nav");
  if (interpretRows.length) groups.push({ label: "Ejecutar con IA", items: interpretRows });
  if (aiRows.length) groups.push({ label: q ? "Sugerencias de IA" : "Comandos de IA", items: aiRows });
  if (navRows.length) groups.push({ label: "Navegación", items: navRows });

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]"
          style={{ background: "rgba(42,40,38,0.28)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
          onMouseDown={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command Center"
            className="glass-modal w-[min(680px,92vw)] animate-fade-up overflow-hidden p-0"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border-subtle px-[18px] py-4">
              <Search
                size={19}
                strokeWidth={2}
                className={phase === "thinking" ? "shrink-0 text-hg-amber" : "shrink-0 text-primary"}
                aria-hidden
              />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                  setPhase("browse");
                }}
                onKeyDown={onInputKeyDown}
                placeholder="Busca o pedí algo en lenguaje natural…"
                autoComplete="off"
                spellCheck={false}
                aria-label="Buscar o pedirle algo a la IA"
                className="flex-1 border-none bg-transparent font-sans text-base text-fg outline-none placeholder:text-fg-subtle"
              />
              <span className="shrink-0 rounded-md border border-border-subtle bg-white/60 px-2 py-0.5 font-data text-[11px] text-fg-muted">
                esc
              </span>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-2.5">
              {phase === "thinking" && (
                <div className="px-3.5 py-5">
                  <div className="flex items-center gap-2.5 font-heading text-sm font-medium text-fg">
                    <Sparkles size={17} strokeWidth={1.9} className="text-primary" aria-hidden />
                    Pensando
                    <span className="ml-0.5 inline-flex gap-1" aria-hidden>
                      <span className="h-1.5 w-1.5 animate-[hgDot_1s_ease-in-out_infinite] rounded-full bg-primary" />
                      <span className="h-1.5 w-1.5 animate-[hgDot_1s_ease-in-out_0.16s_infinite] rounded-full bg-hg-amber" />
                      <span className="h-1.5 w-1.5 animate-[hgDot_1s_ease-in-out_0.32s_infinite] rounded-full bg-hg-orange" />
                    </span>
                  </div>
                  <p className="mt-3 font-sans text-sm text-fg-muted">
                    Interpretando: <span className="text-fg">“{interpreted}”</span>
                  </p>
                </div>
              )}

              {phase === "done" && (
                <div className="px-1.5 pb-2 pt-1.5">
                  <div className="flex gap-2.5 rounded-2xl border border-hg-green-100 bg-hg-green-100 px-3 py-3.5">
                    <Check size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-primary" aria-hidden />
                    <p className="font-sans text-sm text-fg">{MOCK_RESULT.summary}</p>
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {MOCK_RESULT.rows.map((r) => (
                      <li
                        key={r.title}
                        className="glass-fill flex items-center justify-between gap-2.5 rounded-xl border border-white/65 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ background: r.color, boxShadow: `0 0 0 4px color-mix(in srgb, ${r.color} 12%, transparent)` }}
                            aria-hidden
                          />
                          <div>
                            <div className="font-heading text-sm font-medium text-fg">{r.title}</div>
                            <div className="font-sans text-xs text-fg-muted">{r.meta}</div>
                          </div>
                        </div>
                        <span
                          className="rounded-full px-2.5 py-0.5 font-heading text-[11.5px] font-medium"
                          style={{ color: r.color, background: `color-mix(in srgb, ${r.color} 12%, transparent)` }}
                        >
                          {r.tag}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {phase === "browse" &&
                (rows.length === 0 ? (
                  <p className="px-3.5 py-6 text-center font-sans text-sm text-fg-muted">Sin resultados.</p>
                ) : (
                  groups.map((group) => (
                    <div key={group.label} className="px-2 pb-0.5 pt-1.5">
                      <p className="px-2 pb-1 pt-1.5 font-sans text-[10.5px] uppercase tracking-meta text-fg-subtle">
                        {group.label}
                      </p>
                      {group.items.map(({ row, i }) => {
                        const isActive = i === active;
                        const accent =
                          row.kind === "nav" ? "var(--hg-slate)" : row.kind === "interpret" ? "var(--hg-orange)" : "var(--hg-green)";
                        return (
                          <div
                            key={`${row.kind}-${row.label}`}
                            role="option"
                            aria-selected={isActive}
                            tabIndex={-1}
                            onMouseEnter={() => setActive(i)}
                            onClick={() => run(row, i)}
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-[13px] px-2.5 py-2.5 transition-colors",
                              isActive ? "bg-white/70 shadow-sm" : "bg-transparent",
                            )}
                          >
                            <span
                              className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
                              style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)` }}
                              aria-hidden
                            >
                              <Sparkles size={15} strokeWidth={1.9} style={{ color: accent }} />
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-heading text-sm font-medium text-fg">{row.label}</div>
                              <div className="font-sans text-xs text-fg-muted">{row.sub}</div>
                            </div>
                            <span
                              className={cn(
                                "rounded-md border border-border-subtle bg-white/90 px-1.5 py-0.5 font-data text-[11px] text-fg-muted transition-opacity",
                                isActive ? "opacity-100" : "opacity-0",
                              )}
                              aria-hidden
                            >
                              ↵
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))
                ))}
            </div>

            <div className="flex items-center justify-between gap-2.5 border-t border-border-subtle px-4 py-2.5 font-sans text-xs text-fg-muted">
              <div className="flex items-center gap-4">
                <span>
                  <b className="font-data font-medium">↑↓</b> navegar
                </span>
                <span>
                  <b className="font-data font-medium">↵</b> ejecutar
                </span>
                <span>
                  <b className="font-data font-medium">esc</b> cerrar
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-hg-green-100 px-2.5 py-0.5 font-semibold text-primary">
                <Sparkles size={12} strokeWidth={2} aria-hidden />
                IA activa
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
