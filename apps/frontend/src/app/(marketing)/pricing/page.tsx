import PricingTable from "@/components/marketing/PricingTable";

export const metadata = { title: "Tarifas — Human Growth" };

const faq = [
  {
    q: "¿Hay prueba gratuita?",
    a: "Sí. El plan Individual incluye 14 días gratis, sin tarjeta. Para equipos coordinamos un piloto a medida.",
  },
  {
    q: "¿Cómo funciona el cobro por licencia?",
    a: "Pagás solo por las personas activas. El plan Equipos escala de 5 a 500 licencias con descuento anual.",
  },
  {
    q: "¿Puedo cambiar de plan después?",
    a: "Cuando quieras. El upgrade es inmediato y el downgrade aplica en el siguiente ciclo de facturación.",
  },
  {
    q: "¿Tienen facturación para empresas en LatAm?",
    a: "Sí, soportamos compras corporativas y facturación local. El plan Enterprise incluye soporte de procurement.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PricingTable />
      <section className="max-w-[820px] mx-auto px-8 pb-32">
        <h2 className="display text-ink-900 text-4xl mb-10">Preguntas frecuentes</h2>
        <div className="flex flex-col divide-y divide-border border-t border-b border-border">
          {faq.map((item) => (
            <div key={item.q} className="py-6">
              <h3 className="font-semibold text-lg text-ink-900 mb-2">{item.q}</h3>
              <p className="text-ink-800 leading-[1.55]">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
