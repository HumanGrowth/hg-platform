"use client";

import Link from "next/link";
import { useState } from "react";

import { getCopy } from "@/lib/i18n";

type TierStyle = {
  monthly: number | null;
  annual?: number;
  perSeat?: boolean;
  highlighted?: boolean;
};

const styles: TierStyle[] = [
  { monthly: 24, annual: 19 },
  { monthly: 39, annual: 32, perSeat: true, highlighted: true },
  { monthly: null },
];

export default function PricingTable() {
  const c = getCopy("es");
  const [annual, setAnnual] = useState(true);
  const tiers = c.pricing.tiers;

  return (
    <section className="max-w-marketing mx-auto px-8 py-32">
      <div className="flex flex-col items-center text-center mb-12">
        <div className="eyebrow eyebrow-accent mb-4">{c.pricing.eyebrow}</div>
        <h2 className="display text-ink-900 m-0 max-w-[760px] text-[44px] sm:text-[56px] lg:text-[64px]">
          {c.pricing.title}
        </h2>
        <div className="mt-6 inline-flex rounded-md p-[3px]" style={{ background: "var(--cream-200)" }}>
          {(
            [
              [c.pricing.monthly, false],
              [c.pricing.annual, true],
            ] as const
          ).map(([label, val]) => (
            <button
              key={String(label)}
              onClick={() => setAnnual(val)}
              className="px-4 py-2 text-[13px] font-semibold border-0 cursor-pointer rounded-[6px]"
              style={{
                background: annual === val ? "#FFFFFF" : "transparent",
                color: annual === val ? "var(--ink-900)" : "var(--fg-muted)",
                boxShadow: annual === val ? "0 1px 2px rgba(26,26,26,0.06)" : "none",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier, i) => {
          const s = styles[i];
          const price = annual ? s.annual ?? null : s.monthly;
          const h = !!s.highlighted;
          return (
            <div
              key={tier.name}
              className="rounded-xl p-8 flex flex-col gap-[18px] relative"
              style={{
                background: h ? "var(--ink-900)" : "var(--cream-100)",
                color: h ? "var(--cream-100)" : "var(--ink-900)",
                border: h ? "none" : "1px solid var(--border)",
              }}
            >
              {h && (
                <div
                  className="absolute -top-3 left-6 text-[11px] font-bold uppercase px-2.5 py-1 rounded-sm bg-orange text-white"
                  style={{ letterSpacing: "0.08em" }}
                >
                  {c.pricing.badge}
                </div>
              )}
              <div>
                <div className="display" style={{ fontSize: 36, lineHeight: 0.95, color: "inherit" }}>
                  {tier.name}
                </div>
                <div className="mt-2 text-sm leading-[1.5]" style={{ color: h ? "#B3B0A8" : "var(--warm-600)" }}>
                  {tier.tagline}
                </div>
              </div>
              <div
                className="pt-[18px]"
                style={{ borderTop: h ? "1px solid rgba(250,243,232,0.15)" : "1px solid var(--border)" }}
              >
                {price !== null ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display" style={{ fontSize: 64, lineHeight: 0.9 }}>
                      ${price}
                    </span>
                    <span className="text-sm" style={{ color: h ? "#B3B0A8" : "var(--fg-muted)" }}>
                      / {s.perSeat ? c.pricing.perSeat : c.pricing.perMonth}
                    </span>
                  </div>
                ) : (
                  <div className="font-display" style={{ fontSize: 40, lineHeight: 0.95 }}>
                    {c.pricing.letsTalk}
                  </div>
                )}
              </div>
              <ul className="list-none p-0 m-0 flex flex-col gap-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex gap-2.5 items-start text-sm">
                    <span className="font-bold mt-px" style={{ color: h ? "var(--amber)" : "var(--orange)" }}>
                      ✓
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contacto"
                className="border-0 px-[22px] py-3.5 rounded-md font-semibold text-[15px] cursor-pointer mt-auto transition-opacity hover:opacity-90 text-center"
                style={{
                  background: h ? "var(--orange)" : "var(--ink-900)",
                  color: h ? "#fff" : "var(--cream-100)",
                }}
              >
                {tier.cta} →
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
