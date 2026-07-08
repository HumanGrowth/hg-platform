import { FeaturedPaths } from "@/components/marketing/FeaturedPaths";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").perspectives;

export const metadata = { title: c.metaTitle };

// "Nuevo este trimestre" migrado del home a su propio tab (item 14).
export default function PerspectivasPage() {
  return (
    <>
      <section className="max-w-marketing mx-auto px-8 pt-36 pb-10">
        <div className="eyebrow eyebrow-accent mb-6">{c.eyebrow}</div>
        <h1 className="display text-fg m-0 text-5xl sm:text-6xl">{c.title}</h1>
        <p className="mt-6 max-w-[620px] text-[18px] leading-[1.5] text-hg-charcoal">
          {c.subtitle}
        </p>
      </section>
      <FeaturedPaths />
    </>
  );
}
