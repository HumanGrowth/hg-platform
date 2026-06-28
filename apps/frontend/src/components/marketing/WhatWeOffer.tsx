import Link from "next/link";

const CARDS = [
  {
    eyebrow: "01 · DIAGNÓSTICO",
    title: "Empieza por conocerte",
    body: "18 preguntas. 6 dimensiones. ~5 minutos. Un perfil con base científica.",
    stat: "Assessment validado",
  },
  {
    eyebrow: "02 · RUTAS",
    title: "Un mapa de tu próximo paso",
    body: "Trayectos de crecimiento por dimensión, con cursos y contenido curado.",
    stat: "Rutas por dimensión",
  },
  {
    eyebrow: "03 · MENTORÍAS",
    title: "Acompañamiento de quien ya pasó por ahí",
    body: "Mentores latinoamericanos con experiencia real en tu desafío.",
    stat: "En roadmap Q4 2026",
  },
  {
    eyebrow: "04 · BADGES",
    title: "Credenciales de tu avance",
    body: "Reconocimiento verificable de tu crecimiento, dimensión por dimensión.",
    stat: "En roadmap Q4 2026",
  },
];

export default function WhatWeOffer() {
  return (
    <section className="bg-cream-100 border-b border-border">
      <div className="max-w-marketing mx-auto px-8 py-32">
        <div className="flex items-end justify-between mb-16 flex-wrap gap-6">
          <div className="max-w-[760px]">
            <div className="eyebrow eyebrow-accent mb-4">QUÉ OFRECEMOS</div>
            <h2 className="display text-ink-900 max-w-[720px] m-0 text-[44px] sm:text-[56px] lg:text-[64px]">
              Cuatro formas de crecer con intención.
            </h2>
          </div>
          <Link
            href="/paths"
            className="text-orange-700 font-semibold border-b border-orange-700 pb-0.5 hover:text-orange-800"
          >
            Ver todo →
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CARDS.map((f) => (
            <div
              key={f.eyebrow}
              className="bg-cream-50 border border-border rounded-lg p-8 flex flex-col gap-3 min-h-[240px]"
            >
              <div className="flex justify-between items-start">
                <div className="eyebrow eyebrow-accent">{f.eyebrow}</div>
                <span
                  className="font-display text-[18px] text-ink-800"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {f.stat}
                </span>
              </div>
              <h3
                className="display text-ink-900 max-w-[380px] mt-2"
                style={{ fontSize: 36, lineHeight: 1.0 }}
              >
                {f.title}
              </h3>
              <p className="text-ink-800 text-base leading-[1.5] mt-auto">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
