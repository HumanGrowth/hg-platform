import { getCopy } from "@/lib/i18n";

export default function Features() {
  const c = getCopy("es");
  return (
    <section className="bg-cream-50 border-t border-b border-border">
      <div className="max-w-marketing mx-auto px-8 py-32">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
          <div className="max-w-[760px]">
            <div className="eyebrow eyebrow-accent mb-4">{c.features.eyebrow}</div>
            <h2 className="display text-ink-900 max-w-[720px] m-0 text-[44px] sm:text-[56px] lg:text-[64px]">
              {c.features.titleLine1}
              <br />
              {c.features.titleLine2}
            </h2>
            <p className="text-ink-800 text-[18px] leading-[1.5] mt-5 max-w-[560px]">
              {c.features.subtitle}
            </p>
          </div>
          <span className="text-orange-700 font-semibold border-b border-orange-700 pb-0.5">
            {c.features.seeAll} →
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {c.features.items.map((f) => (
            <div
              key={f.eyebrow}
              className="bg-cream-100 border border-border rounded-lg p-8 flex flex-col gap-3 min-h-[260px]"
            >
              <div className="flex justify-between items-start">
                <div className="eyebrow eyebrow-accent">{f.eyebrow}</div>
                <span
                  className="font-display text-[18px] text-ink-800"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {f.stat}
                </span>
              </div>
              <h3
                className="display text-ink-900 max-w-[380px] mt-2"
                style={{ fontSize: 40, lineHeight: 0.98 }}
              >
                {f.title}
              </h3>
              <p className="text-ink-800 text-base leading-[1.5] mt-auto">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
