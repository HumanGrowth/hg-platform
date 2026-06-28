import { Badge, type BadgeProps } from "@/components/ui/badge";

export const metadata = {
  title: "La Ciencia — Human Growth",
  description:
    "Por qué cada pilar de Human Growth se mide con un instrumento psicométrico validado.",
};

interface PillarSci {
  code: string;
  badge: NonNullable<BadgeProps["variant"]>;
  name: string;
  instrument: string;
  validation: string;
  evidence: string;
  result: string;
}

const PILLARS: PillarSci[] = [
  {
    code: "P2", badge: "pillar-p2", name: "Propósito y significado",
    instrument: "MLQ-10 (Steger)",
    validation: "Validado en España, Argentina, Brasil (n≈3.020)",
    evidence:
      "Estudio MIDUS (n=6.000, 14 años de seguimiento): mayor propósito predice menor mortalidad y menor inflamación.",
    result: "4 estados Damon: Latente / Explorador / Direccionado / Integrado",
  },
  {
    code: "P3", badge: "pillar-p3", name: "Relaciones y conexión",
    instrument: "UCLA Loneliness + Cacioppo",
    validation: "Validado en múltiples muestras hispanas",
    evidence:
      "Meta-análisis Holt-Lunstad (+3,4M participantes): la falta de conexión tiene mortalidad comparable a fumar 15 cigarrillos/día.",
    result: "4 niveles: Aislamiento → Funcional → Integrado → Generativo",
  },
  {
    code: "P4", badge: "pillar-p4", name: "Salud y bienestar",
    instrument: "Modelo Transteórico de Prochaska",
    validation: "40+ años de validación, aplicado en CR/MX",
    evidence:
      "OMS: las enfermedades no transmisibles causan 74% de muertes globales. Factores de riesgo modificables.",
    result: "5 etapas Prochaska × 4 dominios (Sueño, Actividad, Nutrición, Recuperación)",
  },
  {
    code: "P5", badge: "pillar-p5", name: "Paz interior y claridad",
    instrument: "ERQ (Gross) + AAQ-II (Hayes)",
    validation: "Validado en Argentina, España",
    evidence:
      "ACT meta-análisis 39 ECAs: reduce ansiedad, depresión y dolor crónico significativamente.",
    result: "4 niveles: Reactivo → Consciente → Regulado → Flexible",
  },
  {
    code: "P6A", badge: "pillar-p6", name: "Resiliencia emocional",
    instrument: "CD-RISC-10 (Connor-Davidson)",
    validation: "Escala de resiliencia más usada en el mundo, validada en español",
    evidence:
      "Bonanno (Columbia): la resiliencia es la respuesta más común al trauma, no la excepción.",
    result: "3 niveles: Baja / Media / Alta",
  },
  {
    code: "P6B", badge: "pillar-p6", name: "Bienestar financiero",
    instrument: "CFPB Financial Wellbeing Scale",
    validation: "Adaptada a Costa Rica (₡)",
    evidence:
      "Mullainathan & Shafir (Science): la preocupación financiera erosiona el rendimiento cognitivo más que la privación severa de sueño.",
    result: "3 niveles: Frágil / Vulnerable / Estable",
  },
];

function PillarScience({ p }: { p: PillarSci }) {
  return (
    <div className="rounded-lg border border-border bg-cream-50 p-8">
      <div className="mb-4 flex items-center gap-3">
        <Badge variant={p.badge}>{p.code}</Badge>
        <h3 className="display m-0 text-xl text-ink-900">{p.name}</h3>
      </div>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="eyebrow mb-1">Instrumento</dt>
          <dd className="text-ink-800">{p.instrument}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Validación</dt>
          <dd className="text-ink-800">{p.validation}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Evidencia causal</dt>
          <dd className="text-ink-800">{p.evidence}</dd>
        </div>
        <div>
          <dt className="eyebrow mb-1">Resultado</dt>
          <dd className="font-mono text-xs text-ink-800">{p.result}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function CienciaPage() {
  return (
    <>
      <section className="max-w-marketing mx-auto px-8 pt-36 pb-16">
        <div className="eyebrow eyebrow-accent mb-6">LA CIENCIA</div>
        <h1 className="display m-0 text-5xl text-ink-900 sm:text-6xl">
          La ciencia detrás de tu radar.
        </h1>
        <p className="mt-6 max-w-[720px] text-[18px] leading-[1.5] text-ink-800">
          Cada pilar tiene un instrumento psicométrico con décadas de validación publicada —
          adaptado al lenguaje y la realidad de Costa Rica y LatAm. No inventamos preguntas.
          Tropicalizamos instrumentos validados.
        </p>
      </section>

      <section className="max-w-marketing mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PILLARS.map((p) => (
            <PillarScience key={p.code} p={p} />
          ))}
        </div>
      </section>

      <section className="max-w-marketing mx-auto px-8 pb-32">
        <div className="mx-auto max-w-[760px] rounded-lg bg-cream-200 p-10">
          <div className="eyebrow mb-3">NUESTRA POSTURA</div>
          <h2 className="display mb-4 text-3xl text-ink-900">
            Por qué no usamos AI generativo para clasificar tu perfil.
          </h2>
          <p className="mb-3 text-base leading-[1.6] text-ink-800">
            Los instrumentos que usamos tienen entre 20 y 50 años de validación con miles de
            participantes. Un modelo de lenguaje que adivina tu estado emocional no tiene esa base —
            y no es defensible pedagógicamente ni legalmente bajo regulaciones como EU AI Act o NYC
            Local Law 144.
          </p>
          <p className="text-base leading-[1.6] text-ink-800">
            La ciencia ya hizo el trabajo difícil. Nuestro aporte es entregarla con un lenguaje
            cercano, sin pedirte que dediques 40 minutos a un cuestionario.
          </p>
        </div>
      </section>
    </>
  );
}
