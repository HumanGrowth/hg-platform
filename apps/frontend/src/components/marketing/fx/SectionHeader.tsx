import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./Reveal";
import { WordReveal } from "./WordReveal";

/** Eyebrow + titular cinético + subtítulo. Patrón común de las secciones. */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
  children,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("mb-12 max-w-[760px]", align === "center" && "mx-auto text-center", className)}>
      {eyebrow ? (
        <Reveal>
          <p className="eyebrow eyebrow-accent mb-4">{eyebrow}</p>
        </Reveal>
      ) : null}
      <WordReveal
        text={title}
        as="h2"
        className="display m-0 text-[40px] leading-[0.98] text-fg sm:text-5xl lg:text-[56px]"
      />
      {subtitle ? (
        <Reveal delay={0.15}>
          <p className="mt-5 max-w-[620px] text-lg leading-relaxed text-fg-muted md:text-xl">{subtitle}</p>
        </Reveal>
      ) : null}
      {children}
    </div>
  );
}
