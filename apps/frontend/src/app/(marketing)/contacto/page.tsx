import { Linkedin, Mail } from "lucide-react";

import ContactForm from "@/components/marketing/ContactForm";

export const metadata = { title: "Conversemos — Human Growth" };

export default function ContactoPage() {
  return (
    <>
      <section className="max-w-[760px] mx-auto px-8 pt-36 pb-8">
        <div className="eyebrow eyebrow-accent mb-6">CONVERSEMOS</div>
        <h1 className="display text-fg text-4xl sm:text-5xl m-0">
          Conversemos · te respondemos en 24h
        </h1>
        <p className="text-hg-charcoal text-[18px] leading-[1.5] mt-6 mb-10 max-w-[560px]">
          Contanos un poco sobre vos y tu equipo. Te respondemos en menos de 24 horas.
        </p>
        <ContactForm source="contacto" />
      </section>

      <section className="max-w-marketing mx-auto px-8 mt-4 pb-20">
        <div className="max-w-[640px] mx-auto border-t border-border pt-10">
          <div className="eyebrow mb-3">OTRAS FORMAS DE CONTACTO</div>
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
            <a
              href="mailto:admin@humangrowth.io"
              className="flex items-center gap-2 text-fg hover:text-primary"
            >
              <Mail size={18} strokeWidth={1.75} />
              <span className="text-sm font-medium">admin@humangrowth.io</span>
            </a>
            <a
              href="https://www.linkedin.com/company/humangrowthlatam"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-fg hover:text-primary"
            >
              <Linkedin size={18} strokeWidth={1.75} />
              <span className="text-sm font-medium">linkedin.com/company/humangrowthlatam</span>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
