import Link from "next/link";

import { BrandSawWave } from "@/components/motion/BrandSawWave";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Para Equipos — Human Growth" };

const valueProps = [
  { title: "Dashboard para gerentes", body: "Quién crece, en qué dimensión y con qué ritmo. Visibilidad real, no diapositivas." },
  { title: "Rutas a la medida", body: "Trayectos personalizados por empresa e industria, alineados a tus objetivos del trimestre." },
  { title: "Mentores por industria", body: "Profesionales latinoamericanos con experiencia real en el problema que tu equipo enfrenta." },
  { title: "Eventos y Masterclass", body: "Sesiones en vivo y grabadas con expertos de la industria para el desarrollo continuo de tu equipo." },
];

export default function ForTeamsPage() {
  const c = getCopy("es");
  return (
    <div className="landing-flow">
      <section className="landing-flow-section landing-flow-hero relative max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BubbleField seed={61} count={5} />
        </DecoLayer>
        <div className="eyebrow eyebrow-accent mb-6">{c.forTeams.eyebrow}</div>
        <h1
          className="display text-fg m-0 text-[44px] sm:text-[56px] lg:text-7xl max-w-[820px]"
          aria-label={`${c.forTeams.titleLine1} ${c.forTeams.titleLine2}`}
        >
          <span aria-hidden>{c.forTeams.titleLine1}</span>
          <br aria-hidden="true" />
          <span aria-hidden>{c.forTeams.titleLine2}</span>
        </h1>
        <p className="text-hg-charcoal text-[18px] leading-[1.5] mt-6 max-w-[620px]">{c.forTeams.body}</p>
        <div className="mt-9 flex gap-3 flex-wrap">
          <Link
            href="/contacto"
            className="bg-primary text-white px-7 py-4 rounded-md font-semibold text-base hover:bg-primary-hover transition-colors"
          >
            Conversemos →
          </Link>
          <Link
            href="/pricing"
            className="bg-transparent text-fg border border-[color:var(--border-strong)] px-7 py-[15px] rounded-md font-semibold text-base hover:bg-bg-sunken transition-colors"
          >
            Ver tarifas
          </Link>
        </div>
      </section>

      <section className="landing-flow-section relative max-w-marketing mx-auto px-8">
        <DecoLayer>
          <BrandSawWave width={260} teeth={7} height={18} rotation={9} bottom="6%" left="3%" color="var(--hg-sage)" opacity={0.3} speed={0.1} />
          <BubbleField seed={62} count={4} />
        </DecoLayer>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {valueProps.map((v) => (
            <div key={v.title} className="bg-surface-card border border-border rounded-lg p-8 flex flex-col gap-3">
              <h3 className="display text-fg m-0" style={{ fontSize: 32, lineHeight: 0.98 }}>
                {v.title}
              </h3>
              <p className="text-hg-charcoal text-base leading-[1.5]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
