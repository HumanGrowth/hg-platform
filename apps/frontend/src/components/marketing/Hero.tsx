"use client";

import Link from "next/link";

import { HeroWatermark } from "@/components/marketing/HeroWatermark";
import { t } from "@/lib/i18n";

const LANG = "es" as const;

/** Marketing hero. CTAs: Conversemos → /contacto · Ver dimensiones → scroll #dimensiones. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden max-w-marketing mx-auto px-8 pt-36 pb-32">
      <HeroWatermark />

      <div className="relative max-w-[920px]">
        <div className="eyebrow eyebrow-accent mb-6">{t("hero.eyebrow", LANG)}</div>
        <h1
          className="display text-fg m-0"
          style={{ fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.95, textWrap: "balance" }}
          aria-label={`${t("hero.titleLine1", LANG)} ${t("hero.titleLine2", LANG)}`}
        >
          <span aria-hidden>{t("hero.titleLine1", LANG)}</span>
          <br aria-hidden="true" />
          <span aria-hidden>{t("hero.titleLine2", LANG)}</span>
        </h1>
        <p className="text-lg md:text-xl leading-relaxed max-w-[560px] mt-6 text-hg-charcoal">
          {t("hero.bodyP1", LANG)}
        </p>
        <p className="text-lg md:text-xl leading-relaxed max-w-[560px] mt-4 mb-9 text-hg-charcoal">
          {t("hero.bodyP2", LANG)}
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          <Link
            href="/contacto"
            className="bg-primary text-white border-0 px-7 py-4 rounded-md font-semibold text-base cursor-pointer whitespace-nowrap hover:bg-primary-hover transition-colors"
          >
            {t("hero.ctaPrimary", LANG)}
          </Link>
          <button
            type="button"
            onClick={() =>
              document
                .getElementById("dimensiones")
                ?.scrollIntoView({ behavior: "smooth", block: "start" })
            }
            className="bg-transparent text-fg border border-[color:var(--border-strong)] px-7 py-[15px] rounded-md font-semibold text-base cursor-pointer whitespace-nowrap hover:bg-bg-sunken transition-colors"
          >
            {t("hero.ctaSecondary", LANG)}
          </button>
          <div className="ml-3 flex items-center gap-2.5">
            <div className="flex">
              {["#C8A76E", "#4A7A54", "#A8C4A0"].map((c, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full border-2 border-hg-cream"
                  style={{ background: c, marginLeft: i ? -10 : 0 }}
                />
              ))}
            </div>
            <span className="body-sm font-medium">{t("hero.socialProof", LANG)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
