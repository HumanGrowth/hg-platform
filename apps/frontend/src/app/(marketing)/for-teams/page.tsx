import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { PageHero } from "@/components/marketing/fx/PageHero";
import { RevealGroup } from "@/components/marketing/fx/Reveal";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { showPricing } from "@/lib/flags";
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
      <PageHero
        eyebrow={c.forTeams.eyebrow}
        title={`${c.forTeams.titleLine1} ${c.forTeams.titleLine2}`}
        subtitle={c.forTeams.body}
      >
        <div className="flex flex-wrap gap-3">
          <CtaLink href="/contacto">Conversemos</CtaLink>
          {showPricing() && (
            <CtaLink href="/pricing" variant="ghost" arrow={false}>
              Ver tarifas
            </CtaLink>
          )}
        </div>
      </PageHero>

      <section className="mx-auto w-full max-w-marketing px-5 pb-20 md:px-8 md:pb-28">
        <RevealGroup className="grid grid-cols-1 gap-5 md:grid-cols-2" step={0.1}>
          {valueProps.map((v, i) => (
            <SpotlightCard key={v.title} className="flex h-full flex-col gap-3 p-8">
              <span className="display text-5xl leading-none text-fg/15">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="display m-0 text-[32px] leading-[0.98] text-fg">{v.title}</h3>
              <p className="text-base leading-normal text-fg-muted">{v.body}</p>
            </SpotlightCard>
          ))}
        </RevealGroup>
      </section>
    </div>
  );
}
