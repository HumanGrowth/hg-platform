import { getCopy } from "@/lib/i18n";

export default function LogoCloud() {
  const c = getCopy("es");
  return (
    <section className="max-w-marketing mx-auto px-8 pb-20 text-center">
      <div className="eyebrow mb-5">{c.logoCloud.eyebrow}</div>
      <p
        className="text-ink-900 max-w-[820px] mx-auto text-[22px] sm:text-[28px] font-semibold leading-[1.25]"
        style={{ letterSpacing: "-0.01em", textWrap: "balance" }}
      >
        {c.logoCloud.trustedBy}
      </p>
      {/* Logos de partners reales: Andrés los agrega después (placeholder grid). */}
      <div className="mt-10 flex items-center justify-center gap-x-10 gap-y-6 flex-wrap opacity-40">
        {["ACME", "NOVA", "VÉRTICE", "PRISMA", "ANDINA", "DELTA"].map((name) => (
          <span key={name} className="font-display text-xl text-ink-800 tracking-tight">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
