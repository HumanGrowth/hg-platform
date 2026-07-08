"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

export default function LogoCloud() {
  const c = useMarketingCopy();
  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8 text-center">
      <div className="eyebrow mb-5">{c.logoCloud.eyebrow}</div>
      {/* Logos placeholder con blur alto: aún no son partners reales. */}
      <div
        className="mt-2 flex items-center justify-center gap-x-10 gap-y-6 flex-wrap opacity-40"
        aria-hidden
        style={{ filter: "blur(6px)" }}
      >
        {["ACME", "NOVA", "VÉRTICE", "PRISMA", "ANDINA", "DELTA"].map((name) => (
          <span key={name} className="font-display text-xl text-hg-charcoal tracking-tight">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
