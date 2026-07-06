import Hero from "@/components/marketing/Hero";
import HowItWorksTimeline from "@/components/marketing/HowItWorksTimeline";
import LogoCloud from "@/components/marketing/LogoCloud";
import MentorStrip from "@/components/marketing/MentorStrip";
import { FeaturedPaths } from "@/components/marketing/FeaturedPaths";
import PricingTable from "@/components/marketing/PricingTable";
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
      <HowItWorksTimeline />
      <FeaturedPaths />
      <MentorStrip />
      <Quote />
      <PricingTable />
    </>
  );
}
