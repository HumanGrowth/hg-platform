/**
 * Quita los markers de citación académica del texto de los Docs (fixes-módulos
 * · Bug #1). Los mentores escriben referencias tipo `[1]`, `[2, 3]`, `[1, 6, 7]`
 * dentro de la prosa; como no hay definición de referencia markdown, se
 * renderizan LITERALES y ensucian la lectura. Se limpian antes de renderizar y
 * antes de correr los parsers (para que no se filtren al label del hero ni al
 * checklist).
 *
 * Sólo matchea corchetes que contienen números/comas → nunca toca `[palabra]`.
 */
export function stripCitationMarkers(text: string): string {
  // El espacio previo opcional evita dejar " ." o dobles espacios tras limpiar.
  return text.replace(/[ \t]*\[\d+(?:\s*,\s*\d+)*\]/g, "").replace(/[ \t]{2,}/g, " ");
}
