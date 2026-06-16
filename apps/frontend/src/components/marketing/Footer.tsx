import Image from "next/image";
import Link from "next/link";

import { getCopy } from "@/lib/i18n";

export default function Footer() {
  const c = getCopy("es");
  return (
    <footer className="bg-cream-200 px-8 pt-20 pb-10" style={{ borderTop: "1px solid var(--border)" }}>
      <div
        className="max-w-marketing mx-auto grid grid-cols-2 md:grid-cols-5 gap-12"
        style={{ gridTemplateColumns: "1.5fr repeat(4, 1fr)" }}
      >
        <div className="col-span-2 md:col-span-1">
          <Image src="/marketing/logo-color.svg" width={200} height={56} className="h-14 w-auto" alt="Human Growth" />
          <p className="body-sm mt-4 max-w-[240px] text-ink-800">{c.footer.tagline}</p>
        </div>
        {c.footer.columns.map((col) => (
          <div key={col.h}>
            <div className="eyebrow mb-3.5">{col.h}</div>
            <ul className="list-none p-0 m-0 flex flex-col gap-2">
              {col.items.map((it) => (
                <li key={it}>
                  <span className="text-sm text-ink-800 cursor-pointer hover:text-ink-900">{it}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div
        className="max-w-marketing mx-auto mt-16 pt-6 flex justify-between items-center flex-wrap gap-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <div className="body-xs">{c.footer.rights}</div>
        <div className="flex gap-[18px] items-center">
          {c.footer.legal.map((l) => (
            <span key={l} className="body-xs cursor-pointer">
              {l}
            </span>
          ))}
          <Link href="/contacto" className="body-xs cursor-pointer text-orange-700 font-semibold">
            Contacto
          </Link>
        </div>
      </div>
    </footer>
  );
}
