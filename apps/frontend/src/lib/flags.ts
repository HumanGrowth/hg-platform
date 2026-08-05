/**
 * Feature flags de build-time (`NEXT_PUBLIC_*`, inlineadas por Next).
 *
 * Se leen como funciones (no consts) para que sean testeables seteando
 * `process.env` en vitest — el inlineado de Next no aplica en los tests.
 */

/**
 * Mostrar precios en el landing público. Default `false` (oculto) mientras la
 * estrategia comercial está en definición. Flipear a `"true"` en Vercel para
 * reactivar en 5 min sin deploy de código.
 */
export const showPricing = (): boolean =>
  process.env.NEXT_PUBLIC_SHOW_PRICING === "true";
