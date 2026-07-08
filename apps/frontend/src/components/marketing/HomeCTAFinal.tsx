import Link from "next/link";

import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCopy } from "@/lib/i18n";

/** CTA final del home → /contacto + /pricing (decisión H, web-v3). */
export function HomeCTAFinal() {
  const c = getCopy("es").homeCta;
  return (
    <section className="max-w-marketing mx-auto px-8 py-24 text-center">
      <Eyebrow accent className="mb-6">
        {c.eyebrow}
      </Eyebrow>
      <Display as="h2" variant="display-3" className="mx-auto mb-6 max-w-[760px]">
        {c.title}
      </Display>
      <p className="body-lg mx-auto mb-8 max-w-[620px] text-fg-muted">{c.body}</p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/contacto"
          className="bg-primary text-white px-8 py-4 rounded-md font-semibold text-base hover:bg-primary-hover transition-colors"
        >
          {c.primary}
        </Link>
        <Link
          href="/pricing"
          className="bg-transparent text-fg border border-[color:var(--border-strong)] px-8 py-4 rounded-md font-semibold text-base hover:bg-bg-sunken transition-colors"
        >
          {c.secondary}
        </Link>
      </div>
    </section>
  );
}
