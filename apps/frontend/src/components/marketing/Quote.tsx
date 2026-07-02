import { QuoteMark } from "@/components/ui/brand";
import { getCopy } from "@/lib/i18n";

export default function Quote() {
  const c = getCopy("es");
  return (
    <section className="max-w-[960px] mx-auto px-8 py-32 text-left">
      <div className="eyebrow eyebrow-accent mb-7">{c.quote.eyebrow}</div>
      <QuoteMark size={72} tone="amber" className="mb-6" />
      <div
        className="font-serif text-fg"
        style={{ fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 1.1, letterSpacing: "-0.01em", textWrap: "balance" }}
      >
        {c.quote.bodyA}
        <span className="italic">{c.quote.bodyEm}</span>
        {c.quote.bodyB}
      </div>
      <div className="mt-8 flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-full text-fg font-bold flex items-center justify-center"
          style={{ background: "#FFD9C2" }}
        >
          JA
        </div>
        <div>
          <div className="font-bold">{c.quote.name}</div>
          <div className="body-sm">{c.quote.role}</div>
        </div>
      </div>
    </section>
  );
}
