import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Reveal } from "./Reveal";
import { WordReveal } from "./WordReveal";

/** Hero estándar de las páginas internas de marketing. */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  align = "left",
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  children?: ReactNode;
}) {
  const center = align === "center";
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-marketing px-5 pb-10 pt-32 md:px-8 md:pb-14 md:pt-40",
        center && "text-center",
      )}
    >
      <Reveal>
        <p className={cn("eyebrow eyebrow-accent mb-5", center && "flex justify-center")}>{eyebrow}</p>
      </Reveal>
      <WordReveal
        text={title}
        as="h1"
        className={cn(
          "display m-0 text-[44px] leading-[0.96] text-fg sm:text-6xl lg:text-[88px]",
          center ? "mx-auto max-w-[1000px]" : "max-w-[1000px]",
        )}
      />
      {subtitle ? (
        <Reveal delay={0.25}>
          <p
            className={cn(
              "mt-6 text-lg leading-relaxed text-fg-muted md:text-xl",
              center ? "mx-auto max-w-[680px]" : "max-w-[680px]",
            )}
          >
            {subtitle}
          </p>
        </Reveal>
      ) : null}
      {children ? <Reveal delay={0.35} className="mt-8">{children}</Reveal> : null}
    </section>
  );
}
