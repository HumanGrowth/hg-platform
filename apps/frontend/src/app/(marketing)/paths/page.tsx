import { PageHero } from "@/components/marketing/fx/PageHero";
import PathsCatalog from "@/components/marketing/PathsCatalog";
import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Rutas de Crecimiento — Human Growth" };

export default function PathsPage() {
  const c = getCopy("es");
  return (
    <div className="landing-flow">
      <PageHero eyebrow={c.paths.pageEyebrow} title={c.paths.pageTitle} subtitle={c.paths.pageBody} />
      <PathsCatalog />
    </div>
  );
}
