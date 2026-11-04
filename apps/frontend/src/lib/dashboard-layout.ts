/** Layout personal de un dashboard: orden de widgets + cuáles están ocultos. */
export interface DashboardLayout {
  order: string[];
  hidden: string[];
}

/**
 * Combina el layout guardado con los widgets que existen hoy. Ignora ids
 * desconocidos (widget retirado o no aplicable), y los widgets nuevos que el
 * usuario nunca vio se agregan al final, visibles.
 */
export function resolveLayout(available: string[], saved: DashboardLayout | null): DashboardLayout {
  const known = new Set(available);
  const order = (saved?.order ?? []).filter((id) => known.has(id));
  for (const id of available) if (!order.includes(id)) order.push(id);
  const hidden = (saved?.hidden ?? []).filter((id) => known.has(id));
  return { order, hidden };
}

/** Mueve `id` a la posición de `targetId` (los demás se corren). */
export function moveBefore(order: string[], id: string, targetId: string): string[] {
  if (id === targetId) return order;
  const without = order.filter((x) => x !== id);
  const at = without.indexOf(targetId);
  if (at === -1) return order;
  without.splice(at, 0, id);
  return without;
}

/** Mueve `id` una posición (-1 arriba/antes, +1 abajo/después), con tope en los extremos. */
export function moveBy(order: string[], id: string, delta: -1 | 1): string[] {
  const i = order.indexOf(id);
  const j = i + delta;
  if (i === -1 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

export function toggleHidden(hidden: string[], id: string): string[] {
  return hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id];
}
