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

/**
 * Rutas custom por Empresa/Organización (/admin/empresa/rutas). Default `false`:
 * la pantalla se muestra con las acciones deshabilitadas y un aviso. Flipear a
 * `"true"` en Vercel para habilitarla sin deploy de código.
 */
export const customPathsEnabled = (): boolean =>
  process.env.NEXT_PUBLIC_CUSTOM_PATHS_ENABLED === "true";

/**
 * Secciones "más humanas" del marketing (home, /metodo y /plataforma, plan
 * v1.2 del 20-nov + ajustes de revisión): fotos de ambientación, hero con
 * datos integrados, dimensiones + radar en una sección, DayAtWork,
 * ThreePeople, Quote con foto de perfil y Hugie con orbe v2 + chat +
 * funciones. Default `false`: se ve el marketing anterior. Flipear a `"true"`
 * en Vercel (y redeployar: es build-time) para publicarlas.
 */
export const showHumanize = (): boolean =>
  process.env.NEXT_PUBLIC_SHOW_HUMANIZE === "true";
