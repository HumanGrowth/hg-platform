import Link from "next/link";

import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Plataforma — Human Growth" };

// Placeholder (item 30). El contenido real vive en el addendum futuro.
export default function PlataformaPage() {
  const c = getCopy("es").comingSoon;
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-marketing flex-col items-center justify-center gap-6 px-8 text-center">
      <h1 className="display text-fg text-4xl sm:text-5xl">{c.title}</h1>
      <Link href="/" className="font-semibold text-primary hover:text-primary-hover">
        {c.back}
      </Link>
    </section>
  );
}
