import Image from "next/image";

import { getCopy } from "@/lib/i18n";

const mentors = [
  { name: "Jorge Araya", role: "Liderazgo Ejecutivo", co: "Ex-CEO Retail LatAm", img: "/marketing/mentors/jorge.jpg", ring: "var(--orange)" },
  { name: "Andrés Aiello", role: "Transformación Digital", co: "Ex-Director, Banca", img: "/marketing/mentors/andres.jpg", ring: "var(--ink-900)" },
  { name: "Karina Víquez", role: "Cultura y Talento", co: "Ex-VP RRHH, Manufactura", img: "/marketing/mentors/karina.jpg", ring: "var(--orange)" },
];

export default function MentorStrip() {
  const c = getCopy("es");
  return (
    <section className="bg-ink-900 text-cream-100 py-32">
      <div className="max-w-marketing mx-auto px-8">
        <div className="flex justify-between items-end mb-14 flex-wrap gap-4">
          <div className="max-w-[760px]">
            <div className="eyebrow text-amber mb-4">{c.mentors.eyebrow}</div>
            <h2 className="display text-cream-100 m-0 max-w-[720px] text-[44px] sm:text-[56px] lg:text-[64px]">
              {c.mentors.titleLine1}
              <br />
              {c.mentors.titleLine2}
            </h2>
            <p className="text-[18px] leading-[1.5] mt-5 max-w-[560px]" style={{ color: "#B3B0A8" }}>
              {c.mentors.subtitle}
            </p>
          </div>
          <span className="text-amber font-semibold border-b border-amber pb-0.5">
            {c.mentors.browseAll} →
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mentors.map((m) => (
            <div key={m.name} className="flex flex-col gap-3">
              <div
                className="rounded-lg relative overflow-hidden"
                style={{ aspectRatio: "3/4", background: "var(--ink-800)" }}
              >
                <Image src={m.img} alt={m.name} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                <div
                  className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase z-10"
                  style={{
                    background: m.ring,
                    color: m.ring === "var(--orange)" ? "#fff" : "var(--cream-100)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {c.mentors.booking}
                </div>
              </div>
              <div>
                <div className="font-bold text-base">{m.name}</div>
                <div className="body-sm" style={{ color: "#B3B0A8" }}>
                  {m.role} · {m.co}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
