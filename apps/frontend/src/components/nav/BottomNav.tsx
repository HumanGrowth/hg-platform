"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAuthStore } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

import { bottomNavItemsForRole, isActive } from "./items";

export function BottomNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const role = useAuthStore((s) => s.user?.role);
  const items = bottomNavItemsForRole(role);
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border bg-bg-raised",
        className,
      )}
    >
      {items.map((item) => {
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
    </nav>
  );
}
