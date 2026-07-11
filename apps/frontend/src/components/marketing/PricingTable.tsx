"use client";

import { Check } from "lucide-react";
import Link from "next/link";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { BrandSawWave } from "@/components/motion/BrandSawWave";
import { BubbleField } from "@/components/motion/BubbleField";
import { DecoLayer } from "@/components/motion/DecoLayer";
import { Card } from "@/components/ui/card";

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
    <div className="flex items-start gap-2 text-sm text-hg-charcoal">
      <Check size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-hg-green" />
      <span>{children}</span>
    </div>
  );
}

/** @deprecated Removido del home (web-v2). La página /pricing sigue vigente. */
export default function PricingTable() {
  const c = useMarketingCopy().pricing;
  return (
    <section className="landing-flow-section landing-flow-hero relative max-w-marketing mx-auto px-8">
      <DecoLayer>
        <BubbleField seed={71} count={5} />
        <BrandSawWave width={220} teeth={6} height={16} rotation={-10} bottom="8%" left="4%" color="var(--hg-gold)" opacity={0.28} speed={0.08} />
      </DecoLayer>
      <div className="flex flex-col items-center text-center mb-12">
        <div className="eyebrow eyebrow-accent mb-4">{c.eyebrow}</div>
        <h2 className="display text-fg m-0 max-w-[760px] text-[44px] sm:text-[56px] lg:text-[64px]">
          {c.title}
        </h2>
        <p className="text-hg-charcoal text-[18px] leading-[1.5] mt-6 max-w-[620px]">{c.subtitle}</p>
      </div>

      <div className="max-w-[720px] mx-auto">
        <Card className="bg-bg-raised p-10 border border-border">
          <div className="eyebrow mb-3">PLAN A LA MEDIDA</div>
          <h3 className="display text-fg mb-4 text-3xl">Construido contigo</h3>
          <p className="text-hg-charcoal mb-8 text-base leading-[1.6]">
            Elegí qué incluir según el momento de tu equipo. Sin compromisos ocultos.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-10">
            {FEATURES.map((f) => (
              <FeatureItem key={f}>{f}</FeatureItem>
            ))}
          </div>

          <Link
            href="/contacto"
            className="block w-full text-center bg-primary text-white px-8 py-4 rounded-md font-semibold text-base hover:bg-primary-hover transition-colors"
          >
            {c.cta} →
          </Link>

          <p className="text-xs text-fg-muted text-center mt-6">{c.ctaNote}</p>
        </Card>
      </div>
    </section>
  );
}
