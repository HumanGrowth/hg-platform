"use client";

import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { showPricing } from "@/lib/flags";

/** CTA final del home → /contacto + /pricing (decisión H, web-v3). */
export function HomeCTAFinal() {
  const c = useMarketingCopy().homeCta;
  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <Reveal variant="scale">
        <div className="glass-surface relative overflow-hidden rounded-[32px] border border-hg-amber/35 p-8 text-center md:p-16">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 bottom-[-40%] h-[420px] w-[420px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(74,122,84,0.7), transparent 70%)" }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-1/3 h-[380px] w-[380px] rounded-full opacity-50 blur-3xl"
            style={{ background: "radial-gradient(circle, rgba(232,83,10,0.5), transparent 70%)" }}
          />
          <div className="relative">
            <p className="eyebrow eyebrow-accent mb-5 flex justify-center">{c.eyebrow}</p>
            <WordReveal
              text={c.title}
              as="h2"
              className="display mx-auto m-0 max-w-[820px] text-[36px] leading-[0.98] text-fg sm:text-5xl lg:text-[64px]"
            />
            <p className="mx-auto mb-8 mt-5 max-w-[620px] text-lg text-fg-muted">{c.body}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <CtaLink href="/contacto">{c.primary.replace(/\s*→$/, "")}</CtaLink>
              {showPricing() && (
                <CtaLink href="/pricing" variant="ghost" arrow={false}>
                  {c.secondary}
                </CtaLink>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
