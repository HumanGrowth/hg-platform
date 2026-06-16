import { create } from "zustand";

/**
 * Estado efímero del onboarding (no persiste server-side todavía). Acumula la
 * respuesta elegida en cada escenario. El scoring real lo hará el motor
 * B2-02/B2-03 cuando los coaches firmen los escenarios.
 */
interface OnboardingState {
  answers: Record<number, string>;
  setAnswer: (index: number, optionId: string) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  answers: {},
  setAnswer: (index, optionId) =>
    set((s) => ({ answers: { ...s.answers, [index]: optionId } })),
  reset: () => set({ answers: {} }),
}));

export const TOTAL_SCENARIOS = 6;

export interface ScenarioOption {
  id: string;
  label: string;
}
export interface Scenario {
  prompt: string;
  options: ScenarioOption[];
}

// Placeholder hasta que los coaches firmen los escenarios situacionales.
export const SCENARIOS: Scenario[] = Array.from({ length: TOTAL_SCENARIOS }, (_, i) => ({
  prompt: `[Coach: completar escenario ${i + 1}] — describí una situación real de trabajo y pedí al usuario cómo reaccionaría.`,
  options: [
    { id: "a", label: "Opción A — [Coach: completar respuesta]" },
    { id: "b", label: "Opción B — [Coach: completar respuesta]" },
    { id: "c", label: "Opción C — [Coach: completar respuesta]" },
    { id: "d", label: "Opción D — [Coach: completar respuesta]" },
  ],
}));
