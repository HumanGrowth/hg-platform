"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

import { isActive, sideNavItemsForRole } from "./items";

const STORAGE_KEY = "hg_sidenav_collapsed";

export function SideNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const items = sideNavItemsForRole(user);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "shrink-0 flex-col justify-between border-r border-border bg-bg-raised py-5 transition-[width] duration-base ease-state",
        collapsed ? "w-16 px-2" : "w-60 px-4",
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <Link href="/home" aria-label="Human Growth — inicio" className="flex items-center px-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collapsed ? "/brand/isotype-dark.png" : "/brand/logo-positive.png"}
            alt="Human Growth"
            className="h-7 w-auto"
          />
        </Link>
        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 font-sans text-sm font-medium transition-colors duration-fast ease-state",
                  collapsed && "justify-center",
                  active ? "bg-bg-sunken text-fg" : "text-fg-muted hover:bg-bg-sunken hover:text-fg",
                )}
              >
                <Icon size={20} strokeWidth={1.75} className={active ? "text-primary" : undefined} />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2.5 font-sans text-sm font-medium text-fg-muted hover:bg-bg-sunken hover:text-fg",
          collapsed && "justify-center",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen size={20} strokeWidth={1.75} />
        ) : (
          <>
            <PanelLeftClose size={20} strokeWidth={1.75} />
            <span>Colapsar</span>
          </>
        )}
      </button>
    </aside>
  );
}
