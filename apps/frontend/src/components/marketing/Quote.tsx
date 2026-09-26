"use client";

import { Reveal } from "@/components/marketing/fx/Reveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { Typewriter } from "@/components/motion/Typewriter";
import { QuoteMark } from "@/components/ui/brand";

/** Quote fundador con dato Deloitte 2024 (item 6). */
export default function Quote() {
  const c = useMarketingCopy();
  return (
    <section className="mx-auto w-full max-w-[1000px] px-5 py-16 md:px-8 md:py-24">
      <Reveal variant="scale">
        <div className="glass-surface-strong relative overflow-hidden p-8 text-left md:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(232,160,48,0.6), transparent 70%)" }}
          />
          <div className="eyebrow eyebrow-accent relative mb-7">{c.quote.eyebrow}</div>
          <QuoteMark size={72} tone="amber" className="relative mb-6" />

          <Typewriter
            as="p"
            text={c.quote.p1}
            speed={15}
            className="relative max-w-[820px] font-heading text-xl leading-snug text-fg md:text-2xl"
          />
          <p className="relative mt-4 font-heading text-2xl font-bold text-hg-orange md:text-3xl">
            {c.quote.ending}
          </p>

          <div className="relative mt-8 flex items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/marketing/mentors/jorge.jpg"
              alt={c.quote.author}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-hg-amber/60"
            />
            <div>
              <div className="font-bold">
                {c.quote.author}{" "}
                <span className="font-normal text-fg-muted">· {c.quote.authorTitle}</span>
              </div>
              <div className="body-xs mt-1 italic text-fg-subtle">{c.quote.source}</div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
