"use client";

import { BookOpenCheck, Lightbulb, ListChecks, MessagesSquare, type LucideIcon } from "lucide-react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  diagnostico: MessagesSquare,
  plan: ListChecks,
  feedback: Lightbulb,
  sintesis: BookOpenCheck,
};

/**
 * Qué va a hacer Hugie dentro de la plataforma (home y /plataforma). Son los
 * puntos de entrada de AI del roadmap v2, contados como sugerencias: Hugie
 * propone, la persona decide.
 */
export function HugieFunctions({
  className,
  headingLevel = "h3",
  wide = false,
}: {
  className?: string;
  headingLevel?: "h3" | "h4";
  /** Cuatro columnas en desktop (ancho completo de /plataforma). */
  wide?: boolean;
}) {
  const c = useMarketingCopy().humanize.hugie.functions;
  const Item = headingLevel;
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p className="m-0 font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-muted">{c.title}</p>
      <ul className={cn("m-0 grid list-none gap-3 p-0 sm:grid-cols-2", wide && "lg:grid-cols-4")}>
        {c.items.map((f) => {
          const Icon = ICONS[f.icon] ?? MessagesSquare;
          return (
            <li key={f.icon} className="glass-surface flex gap-3 p-4">
              <span className="grid h-9 w-9 flex-none place-items-center rounded-md bg-hg-amber/20 text-fg" aria-hidden>
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <Item className="m-0 font-heading text-[15px] font-semibold leading-snug text-fg">{f.title}</Item>
                <p className="m-0 text-sm leading-normal text-fg-muted">{f.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
