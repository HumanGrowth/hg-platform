import { PerspectivasFilter } from "@/components/marketing/PerspectivasFilter";
import { HeroWatermark } from "@/components/marketing/HeroWatermark";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").perspectives;

export const metadata = { title: c.metaTitle };

// Perspectivas: hub de contenido (Blog · Artículos · Casos · Whitepapers).
// El CMS backend vive en claude-code_perspectivas_cms.md (prompt separado).
export default function PerspectivasPage() {
  return (
    <>
      <section className="relative overflow-hidden max-w-marketing mx-auto px-8 pt-36 pb-10">
        <HeroWatermark />
        <div className="eyebrow eyebrow-accent mb-6">{c.eyebrow}</div>
        <h1 className="display text-fg m-0 text-5xl sm:text-6xl">{c.title}</h1>
        <p className="mt-6 max-w-[620px] text-[18px] leading-[1.5] text-hg-charcoal">
          {c.subtitle}
        </p>
      </section>
      <PerspectivasFilter />
    </>
  );
}
