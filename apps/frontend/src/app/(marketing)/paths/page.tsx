import PathsCatalog from "@/components/marketing/PathsCatalog";
import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Rutas de Crecimiento — Human Growth" };

export default function PathsPage() {
  const c = getCopy("es");
  return (
    <div className="landing-flow">
      <section className="landing-flow-section landing-flow-hero max-w-marketing mx-auto px-8">
        <div className="eyebrow eyebrow-accent mb-6">{c.paths.pageEyebrow}</div>
        <h1 className="display text-fg text-5xl sm:text-6xl m-0">{c.paths.pageTitle}</h1>
        <p className="text-hg-charcoal text-[18px] leading-[1.5] mt-6 max-w-[620px]">{c.paths.pageBody}</p>
      </section>
      <PathsCatalog />
    </div>
  );
}
