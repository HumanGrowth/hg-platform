import type { Transition } from "framer-motion";

import type { NarrativeTone } from "@/lib/types";

export interface ToneMotion {
  /** desplazamiento vertical inicial de la entrada (px) */
  y: number;
  transition: Transition;
}

/**
 * Traduce el `narrative_tone` de la unit a parámetros de movimiento (Sprint UI
 * · TASK 9). El tono da "carácter" a cómo aparecen los bloques:
 *  - active: entrada rápida y con energía.
 *  - contemplative: lenta, con aire, casi sólo fade.
 *  - analytical: nítida y contenida (poco desplazamiento).
 *  - warm: rebote suave (spring).
 */
const TONES: Record<NarrativeTone, ToneMotion> = {
  active: { y: 18, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
  contemplative: { y: 8, transition: { duration: 0.7, ease: "easeInOut" } },
  analytical: { y: 4, transition: { duration: 0.3, ease: "easeOut" } },
  warm: { y: 14, transition: { type: "spring", stiffness: 260, damping: 26 } },
};

const DEFAULT: ToneMotion = { y: 12, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } };

/** Parámetros de movimiento para un tono narrativo (default si null/desconocido). */
export function useNarrativeTone(tone: NarrativeTone | null | undefined): ToneMotion {
  return tone ? (TONES[tone] ?? DEFAULT) : DEFAULT;
}
