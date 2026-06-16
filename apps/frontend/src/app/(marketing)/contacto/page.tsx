import ContactForm from "@/components/marketing/ContactForm";

export const metadata = { title: "Conversemos — Human Growth" };

export default function ContactoPage() {
  return (
    <section className="max-w-[760px] mx-auto px-8 pt-36 pb-32">
      <div className="eyebrow eyebrow-accent mb-6">CONVERSEMOS</div>
      <h1 className="display text-ink-900 text-4xl sm:text-5xl m-0">
        Conversemos sobre cómo Human Growth puede acelerar el crecimiento de tu equipo
      </h1>
      <p className="text-ink-800 text-[18px] leading-[1.5] mt-6 mb-10 max-w-[560px]">
        Contanos un poco sobre vos y tu equipo. Te respondemos en menos de 24 horas.
      </p>
      <ContactForm source="contacto" />
    </section>
  );
}
