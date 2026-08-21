import { dimensionShortName } from "@/lib/dimension-styles";

// ─────────────────────────── Arquetipo de crecimiento ───────────────────────────

export interface GrowthArchetype {
  title: string;
  description: string;
}

/**
 * Deriva un "arquetipo" con personalidad a partir de la forma del radar
 * (Record<P1..P6, 0-100>). 100% cliente — no toca backend. Reglas por promedio
 * y dispersión (spread = max − min).
 */
export function growthArchetype(radar: Record<string, number>): GrowthArchetype | null {
  const entries = Object.entries(radar).filter(([, v]) => typeof v === "number");
  if (entries.length === 0) return null;

  const values = entries.map(([, v]) => v);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const spread = max - min;
  const topCode = entries.find(([, v]) => v === max)?.[0] ?? "";
  const topName = dimensionShortName(topCode);

  if (avg < 30) {
    return {
      title: "Explorador en expansión",
      description:
        "Estás empezando a mapear tu crecimiento. Cada módulo y evaluación le va a ir dando forma a tu perfil.",
    };
  }
  if (spread >= 35 && max >= 60) {
    return {
      title: `Especialista en ${topName}`,
      description: `${topName} es claramente tu fortaleza. Un buen próximo paso es nivelar las dimensiones más rezagadas para crecer parejo.`,
    };
  }
  if (spread <= 20 && avg >= 60) {
    return {
      title: "Constructor equilibrado",
      description:
        "Tenés un desarrollo parejo y sólido en todas las dimensiones. Tu desafío es profundizar sin perder ese equilibrio.",
    };
  }
  if (spread <= 20) {
    return {
      title: "Crecimiento parejo",
      description:
        "Avanzás de forma balanceada en todas tus dimensiones. Elegí una para llevar al siguiente nivel.",
    };
  }
  if (avg >= 60) {
    return {
      title: "Referente en formación",
      description: `Tu perfil es fuerte, con ${topName} a la cabeza. Trabajá las dimensiones más bajas para consolidarte.`,
    };
  }
  return {
    title: "En pleno desarrollo",
    description: `Estás construyendo tu perfil con ${topName} como punto de apoyo. Seguí sumando en las dimensiones que querés potenciar.`,
  };
}

// ─────────────────────────── Micro-reto semanal ───────────────────────────

/** Catálogo base de retos por dimensión (careerPath P1..P6). Ampliable por Andy. */
const WEEKLY_CHALLENGES: Record<string, string[]> = {
  P1: [
    "Pedí feedback concreto a alguien sobre una tarea reciente.",
    "Anotá tus 3 logros de la semana y qué aprendiste de cada uno.",
    "Identificá una habilidad que querés desarrollar y buscá un módulo sobre ella.",
  ],
  P2: [
    "Anotá una acción de esta semana que conectó con algo que te importa.",
    "Dedicá 10 minutos a escribir qué querés que cambie gracias a tu trabajo.",
    "Elegí una tarea y hacela pensando en el 'para qué', no solo en el 'qué'.",
  ],
  P3: [
    "Agendá una conversación con alguien de tu equipo que no sea sobre trabajo.",
    "Agradecé de forma específica a una persona que te ayudó.",
    "Ofrecé ayuda a alguien antes de que te la pida.",
  ],
  P4: [
    "Elegí un día de esta semana para cortar a horario y descansar de verdad.",
    "Sumá una caminata de 15 minutos a tu rutina.",
    "Cuidá tu sueño: misma hora para acostarte durante 3 noches seguidas.",
  ],
  P5: [
    "Probá 5 minutos de respiración consciente antes de tu primera reunión.",
    "Identificá un pensamiento recurrente y escribilo para sacarlo de la cabeza.",
    "Reservá 20 minutos sin pantallas para simplemente pensar.",
  ],
  P6: [
    "Revisá un gasto fijo y evaluá si todavía tiene sentido.",
    "Anotá qué te dio seguridad esta semana frente a un imprevisto.",
    "Definí un pequeño colchón de ahorro y tu primer paso para alcanzarlo.",
  ],
};

export interface WeeklyChallenge {
  focusCode: string;
  focusName: string;
  text: string;
}

/**
 * Reto de la semana para la dimensión "en foco" (la de score más bajo). El
 * `weekSeed` (nº de semana) rota el reto dentro del catálogo de esa dimensión.
 */
export function weeklyChallenge(
  radar: Record<string, number>,
  weekSeed: number,
): WeeklyChallenge | null {
  const entries = Object.entries(radar).filter(([, v]) => typeof v === "number");
  if (entries.length === 0) return null;

  // Dimensión en foco = la de menor score.
  const [focusCode] = entries.reduce((lowest, cur) => (cur[1] < lowest[1] ? cur : lowest));
  const list = WEEKLY_CHALLENGES[focusCode];
  if (!list || list.length === 0) return null;

  return {
    focusCode,
    focusName: dimensionShortName(focusCode),
    text: list[Math.abs(weekSeed) % list.length],
  };
}

/** Nº de semana ISO aproximado (para rotar el reto de forma estable en la semana). */
export function weekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const days = Math.floor((date.getTime() - start.getTime()) / 86_400_000);
  return Math.floor(days / 7);
}
