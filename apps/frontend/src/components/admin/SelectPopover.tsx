"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface PopoverOption {
  value: string;
  label: string;
}

/**
 * Selector-popover reutilizable para edición inline en tablas. El trigger lo
 * define el consumidor (chip, texto, header…). El menú se posiciona con
 * `position: fixed` anclado al trigger (getBoundingClientRect) para NO quedar
 * recortado por contenedores con `overflow` (la tabla scrollea en horizontal).
 */
export function SelectPopover({
  value,
  options,
  onSelect,
  renderTrigger,
  disabled = false,
  align = "left",
  menuLabel,
}: {
  value: string;
  options: PopoverOption[];
  onSelect: (v: string) => void;
  renderTrigger: (args: { open: boolean; label: string }) => React.ReactNode;
  disabled?: boolean;
  align?: "left" | "right";
  menuLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const MENU_W = 176; // 11rem

  const place = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = align === "right" ? r.right - MENU_W : r.left;
    setPos({ top: r.bottom + 4, left: Math.max(8, left) });
  }, [align]);

  React.useEffect(() => {
    if (!open) return;
    place();
    // Cerrar al scrollear/resize: el menú fixed quedaría desanclado.
    const close = () => setOpen(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open, place]);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-full items-center disabled:cursor-default"
      >
        {renderTrigger({ open, label: selected?.label ?? value })}
      </button>
      {open && pos ? (
        <>
          <div className="fixed inset-0 z-[60]" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label={menuLabel}
            style={{ top: pos.top, left: pos.left, width: MENU_W }}
            className="fixed z-[61] max-h-64 overflow-auto rounded-lg border border-border bg-bg-raised p-1 shadow-md"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                role="menuitemradio"
                aria-checked={o.value === value}
                onClick={() => {
                  onSelect(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "block w-full truncate rounded-md px-3 py-2 text-left font-sans text-sm hover:bg-bg-sunken",
                  o.value === value ? "font-semibold text-primary" : "text-fg",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}
