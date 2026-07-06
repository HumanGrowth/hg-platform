import { HexIcon } from "@/components/ui/hex-icon";

const PILLARS = [
  { code: "P1", dot: "bg-pillar-p1", name: "Carrera e impacto", body: "Crecé profesionalmente con un mapa claro de tu próximo paso." },
  { code: "P2", dot: "bg-pillar-p2", name: "Propósito y significado", body: "Conectá tu trabajo con algo que de verdad te importa." },
  { code: "P3", dot: "bg-pillar-p3", name: "Relaciones y conexión", body: "Construí redes que te sostienen y te empujan." },
  { code: "P4", dot: "bg-pillar-p4", name: "Salud y bienestar", body: "Sueño, movimiento y energía para sostener el desempeño." },
  { code: "P5", dot: "bg-pillar-p5", name: "Paz interior y claridad", body: "Regulá tus estados internos en presencia del estrés." },
  { code: "P6", dot: "bg-pillar-p6", name: "Estabilidad emocional y material", body: "Resiliencia y seguridad económica como base." },
];

export default function SixPillars() {
  return (
    <section id="dimensiones" className="scroll-mt-24 bg-surface-card border-t border-b border-border">
      <div className="max-w-marketing mx-auto px-8 py-32">
        <div className="max-w-[760px] mb-14">
          <div className="eyebrow eyebrow-accent mb-4">LAS 6 DIMENSIONES</div>
          <h2 className="display text-fg max-w-[720px] m-0 text-[44px] sm:text-[56px] lg:text-[64px]">
            Las 6 dimensiones del profesional completo.
          </h2>
          <p className="text-hg-charcoal text-[18px] leading-[1.5] mt-5 max-w-[560px]">
            No desarrollamos habilidades aisladas. Desarrollamos personas enteras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PILLARS.map((p) => (
            <div key={p.code} className="bg-surface-page border border-border rounded-lg p-7 flex flex-col gap-3">
              <HexIcon pillar={p.code} size={48} />
              <h3 className="display text-fg text-2xl m-0">{p.name}</h3>
              <p className="text-hg-charcoal text-base leading-[1.5]">{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
