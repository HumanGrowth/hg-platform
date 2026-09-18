/**
 * Registry de plantillas de bloque (feat/lu-templates).
 *
 * `templateFor(block)` decide QUÉ plantilla social le corresponde a un bloque:
 *  1. `presentation.template` explícito (tag del autor) → gana siempre.
 *  2. Si no, AUTO-DETECT por tipo de bloque + señales del contenido, con el mismo
 *     criterio que el look histórico (`TextBlockView`): evidence con número →
 *     Stat, solution con lista → Steps, etc.
 *
 * Es una función PURA (sin React) — testeable y reusable por un futuro endpoint
 * de exportación a tamaño social.
 *
 * OJO con el contrato de backward-compat: `templateFor` sólo se consulta para
 * bloques CON `presentation` (ver `hasPresentation` y `BlockRenderer`). Un bloque
 * sin tags sigue por `TextBlockView` — el DOM histórico, garantizado por el test
 * de regresión — así que el auto-detect nunca puede cambiar una unit ya creada.
 */
import { detectChecklistItems, detectHeroStat } from "@/lib/parsers/autoDetect";
import { stripCitationMarkers } from "@/lib/parsers/stripCitationMarkers";
import { extractInlineStat } from "@/lib/markdown/markers";
import type { Block, BlockPresentation, TemplateKind, TextBlock } from "@/lib/types";

/** Plantillas de texto que esta sesión implementa. */
export const TEXT_TEMPLATES = ["editorial", "stat", "quote", "tip", "steps"] as const;
export type TextTemplate = (typeof TEXT_TEMPLATES)[number];

const isTextTemplate = (t: string | null | undefined): t is TextTemplate =>
  (TEXT_TEMPLATES as readonly string[]).includes(t ?? "");

/** Un tip es una acción corta: sin lista y de ≤ 220 caracteres de texto plano. */
const TIP_MAX_CHARS = 220;

const PRESENTATION_KEYS: (keyof BlockPresentation)[] = [
  "template",
  "format",
  "tone",
  "accent",
  "motif",
  "emphasis_level",
  "pull_quote",
  "cta",
];

/** ¿El bloque trae algún tag de presentación? (`null`, `{}` o sólo nulls → no). */
export function hasPresentation(block: Block): boolean {
  const p = (block as { presentation?: BlockPresentation | null }).presentation;
  if (!p || typeof p !== "object") return false;
  return PRESENTATION_KEYS.some((k) => p[k] != null);
}

/** Cita dominante: el cuerpo arranca con `>` (blockquote) pero no `>>` (headline). */
function isQuoteDominant(body: string): boolean {
  return /^\s*>(?!>)/.test(body);
}

function plainLength(body: string): number {
  return body
    .replace(/[*_`~>#]|==/g, "")
    .replace(/\s+/g, " ")
    .trim().length;
}

function detectTextTemplate(block: TextBlock): TextTemplate {
  const body = stripCitationMarkers(block.body);
  const pullQuote = block.presentation?.pull_quote;

  switch (block.variant) {
    case "evidence": {
      if (block.hero_stat || extractInlineStat(body)) return "stat";
      if (pullQuote || isQuoteDominant(body)) return "quote";
      if (detectHeroStat(body)) return "stat";
      return "editorial";
    }
    case "solution": {
      if (block.checklist_items?.length || detectChecklistItems(body)) return "steps";
      if (plainLength(body) <= TIP_MAX_CHARS) return "tip";
      return "editorial";
    }
    case "context":
    default:
      return "editorial";
  }
}

/**
 * Plantilla de un bloque (cualquier tipo). Para texto: explícita → auto-detect.
 * Para el resto es fija por tipo: quiz → interactive, reflection → quote,
 * video → video (sus vistas ya existen y sólo se re-encuadran).
 */
export function templateFor(block: Block): TemplateKind {
  switch (block.block_type) {
    case "video_intro":
    case "video_teaching":
    case "video_closing":
      return "video";
    case "quiz_recall":
      return "interactive";
    case "reflection_write":
      return "quote";
    case "text_context":
    case "text_evidence":
    case "text_solution":
      return block.presentation?.template ?? detectTextTemplate(block);
  }
}

/**
 * Plantilla de texto efectivamente renderizable. Un `template` explícito que esta
 * sesión no implementa (announce/data/interactive/video sobre un bloque de texto)
 * cae al auto-detect en vez de romper.
 */
export function resolveTextTemplate(block: TextBlock): TextTemplate {
  const kind = templateFor(block);
  return isTextTemplate(kind) ? kind : detectTextTemplate(block);
}
