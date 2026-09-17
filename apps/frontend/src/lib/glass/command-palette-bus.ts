/**
 * Bus mínimo para abrir GlassCommandPalette desde fuera (ej. el botón ⌘K del
 * dock de SpatialCanvas) sin levantar su estado `open` a un padre compartido.
 */
export const OPEN_COMMAND_PALETTE_EVENT = "hg:open-command-palette";

export function openGlassCommandPalette() {
  document.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
}
