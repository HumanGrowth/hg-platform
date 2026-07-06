import Hero from "@/components/marketing/Hero";
import HowItWorksTimeline from "@/components/marketing/HowItWorksTimeline";
import MarketingRadar from "@/components/marketing/MarketingRadar";
import WhatIsHg from "@/components/marketing/WhatIsHg";
import LogoCloud from "@/components/marketing/LogoCloud";
import { FeaturedPaths } from "@/components/marketing/FeaturedPaths";
import Quote from "@/components/marketing/Quote";
import SixPillars from "@/components/marketing/SixPillars";

export const metadata = {
  title: "Human Growth — Crecé integralmente",
  description:
    "Plataforma de crecimiento profesional holístico — 6 dimensiones del crecimiento humano para profesionales de LatAm.",
};

export default function LandingPage() {
  return (
    <>
      <Hero />
      <LogoCloud />
      <SixPillars />
      <MarketingRadar />
      <WhatIsHg />
      <HowItWorksTimeline />
      <FeaturedPaths />
      <Quote />
    </>
  );
}
