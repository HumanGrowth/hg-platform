"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { MotionSection } from "@/components/motion/MotionSection";
import { QuoteMark } from "@/components/ui/brand";

/** Quote fundador con dato Deloitte 2024 (item 6). */
export default function Quote() {
  const c = useMarketingCopy();
  return (
    <section className="landing-flow-section max-w-[960px] mx-auto px-8 text-left">
      <MotionSection as="div">
      <div className="eyebrow eyebrow-accent mb-7">{c.quote.eyebrow}</div>
      <QuoteMark size={72} tone="amber" className="mb-6" />

      <p className="font-heading text-xl md:text-2xl leading-snug text-fg max-w-[820px]">
        {c.quote.p1}
      </p>
      <p className="mt-4 font-heading text-2xl md:text-3xl font-bold text-hg-orange">
        {c.quote.ending}
      </p>

      <div className="mt-8 flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-full text-fg font-bold flex items-center justify-center"
          style={{ background: "#FFD9C2" }}
        >
          JA
        </div>
        <div>
          <div className="font-bold">
            {c.quote.author}{" "}
            <span className="font-normal text-fg-muted">· {c.quote.authorTitle}</span>
          </div>
          <div className="body-xs italic text-fg-subtle mt-1">{c.quote.source}</div>
        </div>
      </div>
      </MotionSection>
    </section>
  );
}
