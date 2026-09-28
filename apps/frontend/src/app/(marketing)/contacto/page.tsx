import { Linkedin, Mail } from "lucide-react";

import ContactForm from "@/components/marketing/ContactForm";
import { ContactHero } from "@/components/marketing/ContactHero";
import { DocTitle, Tr } from "@/components/marketing/LocalizedText";
import { Reveal } from "@/components/marketing/fx/Reveal";

export const metadata = { title: "Conversemos — Human Growth" };

export default function ContactoPage() {
  return (
    <div className="landing-flow">
      <DocTitle k="meta.contact" />
      <ContactHero />
      <section className="mx-auto w-full max-w-marketing px-5 md:px-8">
        <Reveal variant="scale">
          <ContactForm source="contacto" />
        </Reveal>
      </section>

      <section className="mx-auto mt-12 w-full max-w-marketing px-5 pb-24 md:px-8">
        <Reveal>
          <div className="mx-auto max-w-[640px] border-t border-border pt-10">
            <div className="eyebrow mb-3">
              <Tr k="contact.otherWays" />
            </div>
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              <a href="mailto:admin@humangrowth.io" className="flex items-center gap-2 text-fg transition-colors hover:text-primary">
                <Mail size={18} strokeWidth={1.75} />
                <span className="text-sm font-medium">admin@humangrowth.io</span>
              </a>
              <a
                href="https://www.linkedin.com/company/humangrowthlatam"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-fg transition-colors hover:text-primary"
              >
                <Linkedin size={18} strokeWidth={1.75} />
                <span className="text-sm font-medium">linkedin.com/company/humangrowthlatam</span>
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
