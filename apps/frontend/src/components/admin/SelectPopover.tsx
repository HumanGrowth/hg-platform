"use client";

import * as React from "react";

import { AnchoredMenu } from "@/components/admin/AnchoredMenu";
import { cn } from "@/lib/utils";

export interface PopoverOption {
  value: string;
  label: string;
}

/**
 * Selector-popover reutilizable para edición inline en tablas. El trigger lo
 * define el consumidor (chip, texto, header…). El menú se posiciona con
 * portal (`AnchoredMenu`) anclado al trigger, para NO quedar recortado ni
 * desfasado por contenedores con `overflow` o `backdrop-filter`.
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
  const MENU_W = 176; // 11rem
  const close = React.useCallback(() => setOpen(false), []);

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
      <AnchoredMenu
        anchor={triggerRef.current}
        open={open}
        onClose={close}
        align={align}
        width={MENU_W}
        label={menuLabel}
        className="p-1"
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
      </AnchoredMenu>
    </>
  );
}
