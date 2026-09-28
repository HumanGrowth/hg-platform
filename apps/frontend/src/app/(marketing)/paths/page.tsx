import { DocTitle } from "@/components/marketing/LocalizedText";
import PathsCatalog from "@/components/marketing/PathsCatalog";
import { PathsHero } from "@/components/marketing/PathsHero";

export const metadata = { title: "Rutas de Crecimiento — Human Growth" };

export default function PathsPage() {
  return (
    <div className="landing-flow">
      <DocTitle k="meta.paths" />
      <PathsHero />
      <PathsCatalog />
    </div>
  );
}
