import { getCopy } from "@/lib/i18n";

export default function LogoCloud() {
  const c = getCopy("es");
  return (
    <section className="max-w-marketing mx-auto px-8 pb-20 text-center">
      <div className="eyebrow mb-5">{c.logoCloud.eyebrow}</div>
      {/* Logos placeholder con blur alto: aún no son partners reales. */}
      <div
        className="mt-2 flex items-center justify-center gap-x-10 gap-y-6 flex-wrap opacity-40"
        aria-hidden
        style={{ filter: "blur(6px)" }}
      >
        {["ACME", "NOVA", "VÉRTICE", "PRISMA", "ANDINA", "DELTA"].map((name) => (
          <span key={name} className="font-display text-xl text-ink-800 tracking-tight">
            {name}
          </span>
        ))}
      </div>
    </section>
  );
}
