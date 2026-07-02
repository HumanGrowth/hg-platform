"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { cn } from "@/lib/utils";

import { BOTTOM_NAV_ITEMS_BASE, isActive, Menu } from "./items";
import { MoreDrawer } from "./MoreDrawer";

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-bg-raised",
          className,
        )}
      >
        {BOTTOM_NAV_ITEMS_BASE.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href as Route}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 font-sans text-[11px] font-medium transition-colors",
                active ? "text-orange" : "text-fg-muted",
              )}
            >
              <Icon size={22} strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-label="Más opciones"
          className="flex flex-1 flex-col items-center justify-center gap-1 py-2.5 font-sans text-[11px] font-medium text-fg-muted transition-colors"
        >
          <Menu size={22} strokeWidth={1.75} />
          Más
        </button>
      </nav>
      <MoreDrawer open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
