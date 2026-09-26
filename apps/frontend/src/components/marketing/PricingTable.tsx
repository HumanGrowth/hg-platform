"use client";

import { Check } from "lucide-react";

import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { PageHero } from "@/components/marketing/fx/PageHero";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";

const FEATURES = [
  "Diagnóstico inicial con base científica",
  "Catálogo de trayectos completos",
  "Biblioteca de contenido HG",
  "Player de video adaptativo",
  "Dashboard para manager directo",
  "Dashboard RRHH con métricas org",
  "Export CSV de progreso",
  "Onboarding asistido del equipo",
  "Soporte LatAm en horario local",
  "Acceso web + mobile responsive",
  "Re-takes del assessment (cada 30d)",
  "Documentación de privacidad y GDPR",
];

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-fg">
      <Check size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-hg-green" />
      <span>{children}</span>
    </div>
  );
}

/** Página /pricing: plan a la medida (sin tarifas públicas). */
export default function PricingTable() {
  const c = useMarketingCopy().pricing;
  return (
    <>
      <PageHero align="center" eyebrow={c.eyebrow} title={c.title} subtitle={c.subtitle} />
      <section className="mx-auto w-full max-w-[720px] px-5 pb-24 md:px-8">
        <Reveal variant="scale">
          <SpotlightCard className="p-8 md:p-10">
            <div className="eyebrow mb-3">PLAN A LA MEDIDA</div>
            <h3 className="display mb-4 text-3xl text-fg">Construido contigo</h3>
            <p className="mb-8 text-base leading-[1.6] text-fg-muted">
              Elegí qué incluir según el momento de tu equipo. Sin compromisos ocultos.
            </p>

            <RevealGroup className="mb-10 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2" step={0.04}>
              {FEATURES.map((f) => (
                <FeatureItem key={f}>{f}</FeatureItem>
              ))}
            </RevealGroup>

            <CtaLink href="/contacto" className="w-full justify-center">
              {c.cta}
            </CtaLink>

            <p className="mt-6 text-center text-xs text-fg-muted">{c.ctaNote}</p>
          </SpotlightCard>
        </Reveal>
      </section>
    </>
  );
}
