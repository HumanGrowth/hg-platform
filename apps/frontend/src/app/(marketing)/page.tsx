import Features from "@/components/marketing/Features";
import Hero from "@/components/marketing/Hero";
import LogoCloud from "@/components/marketing/LogoCloud";
import MentorStrip from "@/components/marketing/MentorStrip";
import { FeaturedPaths } from "@/components/marketing/PathCard";
import PricingTable from "@/components/marketing/PricingTable";
import Quote from "@/components/marketing/Quote";

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
      <Features />
      <FeaturedPaths />
      <MentorStrip />
      <Quote />
      <PricingTable />
    </>
  );
}
