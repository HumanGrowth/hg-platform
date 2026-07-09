"use client";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { PartnerMarquee } from "@/components/motion/PartnerMarquee";

const PARTNERS = ["ACME", "NOVA", "VÉRTICE", "PRISMA", "ANDINA", "DELTA"];

export default function LogoCloud() {
  const c = useMarketingCopy();
  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8 text-center">
      <div className="eyebrow mb-5">{c.logoCloud.eyebrow}</div>
      {/* Logos placeholder con blur alto: aún no son partners reales. */}
      <PartnerMarquee speed={28} className="mt-2 opacity-40" pauseOnHover>
        {PARTNERS.map((name) => (
          <span
            key={name}
            aria-hidden
            className="font-display text-xl text-hg-charcoal tracking-tight"
            style={{ filter: "blur(6px)" }}
          >
            {name}
          </span>
        ))}
      </PartnerMarquee>
    </section>
  );
}
