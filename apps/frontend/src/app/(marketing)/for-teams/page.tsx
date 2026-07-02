import Link from "next/link";

import { getCopy } from "@/lib/i18n";

export const metadata = { title: "Para Equipos — Human Growth" };

const valueProps = [
  { title: "Dashboard para gerentes", body: "Quién crece, en qué dimensión y con qué ritmo. Visibilidad real, no diapositivas." },
  { title: "Rutas a la medida", body: "Trayectos personalizados por empresa e industria, alineados a tus objetivos del trimestre." },
  { title: "Mentores por industria", body: "Profesionales latinoamericanos con experiencia real en el problema que tu equipo enfrenta." },
  { title: "SSO + integración RRHH", body: "Single sign-on y sincronización con tu HRIS. Listo para equipos de 5 a 500 personas." },
];

export default function ForTeamsPage() {
  const c = getCopy("es");
  return (
    <>
      <section className="max-w-marketing mx-auto px-8 pt-36 pb-16">
        <div className="eyebrow eyebrow-accent mb-6">{c.forTeams.eyebrow}</div>
        <h1
          className="display text-ink-900 m-0 text-[44px] sm:text-[56px] lg:text-7xl max-w-[820px]"
          aria-label={`${c.forTeams.titleLine1} ${c.forTeams.titleLine2}`}
        >
          <span aria-hidden>{c.forTeams.titleLine1}</span>
          <br aria-hidden="true" />
          <span aria-hidden>{c.forTeams.titleLine2}</span>
        </h1>
        <p className="text-ink-800 text-[18px] leading-[1.5] mt-6 max-w-[620px]">{c.forTeams.body}</p>
        <div className="mt-9 flex gap-3 flex-wrap">
          <Link
            href="/contacto"
            className="bg-orange text-white px-7 py-4 rounded-md font-semibold text-base hover:bg-primary-hover transition-colors"
          >
            Conversemos →
          </Link>
          <Link
            href="/pricing"
            className="bg-transparent text-ink-900 border border-[color:var(--border-strong)] px-7 py-[15px] rounded-md font-semibold text-base hover:bg-bg-sunken transition-colors"
          >
            Ver tarifas
          </Link>
        </div>
      </section>

      <section className="max-w-marketing mx-auto px-8 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {valueProps.map((v) => (
            <div key={v.title} className="bg-cream-50 border border-border rounded-lg p-8 flex flex-col gap-3">
              <h3 className="display text-ink-900 m-0" style={{ fontSize: 32, lineHeight: 0.98 }}>
                {v.title}
              </h3>
              <p className="text-ink-800 text-base leading-[1.5]">{v.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
