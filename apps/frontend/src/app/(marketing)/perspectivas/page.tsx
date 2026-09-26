import { PageHero } from "@/components/marketing/fx/PageHero";
import { PerspectivasFilter } from "@/components/marketing/PerspectivasFilter";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").perspectives;

export const metadata = { title: c.metaTitle };

// Perspectivas: hub de contenido (Blog · Artículos · Casos · Whitepapers).
// El CMS backend vive en claude-code_perspectivas_cms.md (prompt separado).
export default function PerspectivasPage() {
  return (
    <div className="landing-flow">
      <PageHero eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
      <PerspectivasFilter />
    </div>
  );
}
