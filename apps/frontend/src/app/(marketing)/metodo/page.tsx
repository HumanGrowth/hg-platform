import { DocTitle } from "@/components/marketing/LocalizedText";
import { MetodoContent } from "@/components/marketing/MetodoContent";
import { getCopy } from "@/lib/i18n";

const c = getCopy("es").method;

// SEO en ES; document.title sigue al idioma activo vía DocTitle.
export const metadata = {
  title: c.meta.title,
  description: c.meta.description,
};

export default function MetodoPage() {
  return (
    <>
      <DocTitle k="method.meta.title" />
      <MetodoContent />
    </>
  );
}
