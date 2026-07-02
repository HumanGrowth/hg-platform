import Image from "next/image";
import Link from "next/link";

import { t } from "@/lib/i18n";

const LANG = "es" as const;

/** Marketing hero — porteado del lovable. CTAs: Conversemos → /login · Ver rutas → /paths. */
export default function Hero() {
  return (
    <section className="relative overflow-hidden max-w-marketing mx-auto px-8 pt-36 pb-32">
      <div className="absolute -right-20 top-10 opacity-[0.06] pointer-events-none hidden md:block">
        <Image src="/brand/logo-positive.png" width={720} height={720} className="h-[720px] w-auto" alt="" aria-hidden />
      </div>

      <div className="relative max-w-[920px]">
        <div className="eyebrow eyebrow-accent mb-6">{t("hero.eyebrow", LANG)}</div>
        <h1
          className="display text-fg m-0"
          style={{ fontSize: "clamp(64px, 9vw, 128px)", lineHeight: 0.9, textWrap: "balance" }}
          aria-label={`${t("hero.titleLine1", LANG)} ${t("hero.titleLine2", LANG)}`}
        >
          <span aria-hidden>{t("hero.titleLine1", LANG)}</span>
          <br aria-hidden="true" />
          <span aria-hidden>{t("hero.titleLine2", LANG)}</span>
        </h1>
        <p className="text-[22px] leading-[1.45] max-w-[560px] mt-7 mb-9 text-hg-charcoal">
          {t("hero.bodyBefore", LANG)}
          <em className="serif-italic">{t("hero.bodyEm", LANG)}</em>
          {t("hero.bodyAfter", LANG)}
        </p>
        <div className="flex gap-3 items-center flex-wrap">
          <Link
            href="/contacto"
            className="bg-primary text-white border-0 px-7 py-4 rounded-md font-semibold text-base cursor-pointer whitespace-nowrap hover:bg-primary-hover transition-colors"
          >
            Conversemos →
          </Link>
          <Link
            href="/paths"
            className="bg-transparent text-fg border border-[color:var(--border-strong)] px-7 py-[15px] rounded-md font-semibold text-base cursor-pointer whitespace-nowrap hover:bg-bg-sunken transition-colors"
          >
            Ver rutas
          </Link>
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
