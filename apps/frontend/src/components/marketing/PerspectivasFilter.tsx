"use client";

import { useState } from "react";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { BrandCircle } from "@/components/motion/BrandCircle";
import { BrandSawWave } from "@/components/motion/BrandSawWave";
import { DecoLayer } from "@/components/motion/DecoLayer";

/**
 * Chips por content type de Perspectivas (Blog · Artículos · Business cases ·
 * Whitepapers). Sin data todavía: el CMS backend vive en el prompt
 * claude-code_perspectivas_cms.md — cuando exista, la grilla se puebla via
 * fetch filtrado por el chip activo.
 */
export function PerspectivasFilter() {
  const c = useMarketingCopy().perspectives;
  const [active, setActive] = useState<string>("all");

  const chip = (isActive: boolean) =>
    `px-3.5 py-2 rounded-full text-[13px] font-medium cursor-pointer transition-colors border ${
      isActive
        ? "bg-hg-ink text-hg-cream border-transparent"
        : "bg-transparent text-hg-charcoal border-border-strong hover:bg-bg-sunken"
    }`;

  return (
    <section className="landing-flow-section max-w-marketing mx-auto px-8">
      <DecoLayer>
        <BrandSawWave width={260} teeth={7} height={18} rotation={-10} top="30%" right="2%" color="var(--hg-gold)" opacity={0.3} speed={0.1} />
      </DecoLayer>
      <div className="mb-10 flex flex-wrap gap-2">
        <button type="button" className={chip(active === "all")} onClick={() => setActive("all")}>
          Todo
        </button>
        {c.contentTypes.map((t) => (
          <button
            key={t.id}
            type="button"
            className={chip(active === t.id)}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Empty state hasta que el CMS provea contenido */}
      <div className="py-16 text-center">
        <p className="body-lg text-fg-muted">{c.emptyState}</p>
      </div>
    </section>
  );
}
