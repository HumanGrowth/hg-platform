import { PerspectivasHero } from "@/components/marketing/PerspectivasHero";
import { PerspectivasFilter } from "@/components/marketing/PerspectivasFilter";
import { DocTitle } from "@/components/marketing/LocalizedText";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").perspectives;

export const metadata = { title: c.metaTitle };

// Perspectivas: hub de contenido (Blog · Artículos · Casos · Whitepapers).
// El CMS backend vive en claude-code_perspectivas_cms.md (prompt separado).
export default function PerspectivasPage() {
  return (
    <div className="landing-flow">
      <DocTitle k="perspectives.metaTitle" />
      <PerspectivasHero />
      <PerspectivasFilter />
    </div>
  );
}
