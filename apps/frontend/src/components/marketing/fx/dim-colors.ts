/** Colores de las 6 dimensiones (alineados a los mockups de producto). */
export const DIM_COLORS = ["#e8530a", "#c8a76e", "#4a7a54", "#a8c4a0", "#7f9bb8", "#e8a030"] as const;
export const DIM_SHORT = ["Carrera", "Propósito", "Relaciones", "Salud", "Paz interior", "Estabilidad"] as const;

/** "#rrggbb" → "r,g,b" (para rgba(var(--glow), a)). */
export function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}
