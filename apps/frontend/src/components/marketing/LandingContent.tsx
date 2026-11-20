import Hero from "@/components/marketing/Hero";
import { HomeCTAFinal } from "@/components/marketing/HomeCTAFinal";
import HowItWorksTimeline from "@/components/marketing/HowItWorksTimeline";
import { HugieTeaser } from "@/components/marketing/HugieTeaser";
import LogoCloud from "@/components/marketing/LogoCloud";
import MarketingRadar from "@/components/marketing/MarketingRadar";
import { DayAtWork } from "@/components/marketing/people/DayAtWork";
import { ProductStack } from "@/components/marketing/ProductStack";
import Quote from "@/components/marketing/Quote";
import SixDimensions from "@/components/marketing/SixDimensions";
import WhatIsHg from "@/components/marketing/WhatIsHg";
import { showHumanize } from "@/lib/flags";

/**
 * Contenido del home de marketing. Vive en su propio componente porque se
 * renderiza en dos rutas: "/" (el middleware la saca de acá si hay sesión,
 * como atajo directo a /home) y "/info" (siempre visible, con o sin sesión —
 * el link que se puede compartir con alguien ya logueado en la app).
 */
export function LandingContent() {
  // Plan v1.2 "marketing más humano": secciones aditivas detrás del flag.
  const humanize = showHumanize();
  return (
    <div className="landing-flow">
      <Hero />
      <LogoCloud />
      <SixDimensions />
      <MarketingRadar />
      <WhatIsHg />
      {humanize ? <DayAtWork /> : null}
      <ProductStack />
      <HugieTeaser />
      <HowItWorksTimeline />
      <Quote />
      <HomeCTAFinal />
    </div>
  );
}
