import { LandingContent } from "@/components/marketing/LandingContent";
import { DocTitle } from "@/components/marketing/LocalizedText";

// "/info": el mismo home de marketing que "/", pero SIN el redirect a /home
// que el middleware aplica en "/" cuando hay sesión activa (ver
// middleware.ts). Sirve para compartir el sitio público con alguien que ya
// tiene cuenta, o para que un usuario logueado vuelva a ver la landing.
export const metadata = {
  title: "Human Growth — Crecé integralmente",
  description:
    "Plataforma de crecimiento profesional holístico — 6 dimensiones del crecimiento humano para profesionales de LatAm.",
};

export default function InfoPage() {
  return (
    <>
      <DocTitle k="meta.home" />
      <LandingContent />
    </>
  );
}
