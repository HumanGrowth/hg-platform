"use client";

import { motion } from "framer-motion";
import * as React from "react";

import { BlockScreenLayout } from "@/components/modulos/blocks/BlockScreenLayout";
import { useAutoCompleteBlock } from "@/components/modulos/blocks/useAutoCompleteBlock";
import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";
import { stripCitationMarkers } from "@/lib/parsers/stripCitationMarkers";
import type { NarrativeTone, TextBlock } from "@/lib/types";

import { EditorialTemplate } from "./EditorialTemplate";
import type { TemplateProps } from "./parts";
import { QuoteTemplate } from "./QuoteTemplate";
import { StatTemplate } from "./StatTemplate";
import { StepsTemplate } from "./StepsTemplate";
import { resolvePresentation } from "./style";
import { TipTemplate } from "./TipTemplate";
import type { TextTemplate } from "./registry";

const TEMPLATES: Record<TextTemplate, React.ComponentType<TemplateProps>> = {
  editorial: EditorialTemplate,
  stat: StatTemplate,
  quote: QuoteTemplate,
  tip: TipTemplate,
  steps: StepsTemplate,
};

/**
 * Bloque de texto renderizado como plantilla social (sólo para bloques CON
 * `presentation`; los demás siguen en `TextBlockView`). Resuelve tone/format/
 * accent/motif/énfasis, monta la plantilla dentro de `BlockScreenLayout` y
 * conserva el auto-complete a los 3s del look clásico.
 */
export function TemplatedTextBlock({
  block,
  isCompleted,
  onCompleteBlock,
  dimensionCode,
  narrativeTone,
}: {
  block: TextBlock;
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
  dimensionCode?: string;
  narrativeTone?: NarrativeTone | null;
}) {
  const shouldAnimate = useShouldAnimate();
  useAutoCompleteBlock(block.id, isCompleted, onCompleteBlock);

  const p = resolvePresentation(block, { dimensionCode, narrativeTone });
  const Template = TEMPLATES[p.template];
  const inner = <Template block={block} body={stripCitationMarkers(block.body)} dimensionCode={dimensionCode} p={p} />;

  return (
    <BlockScreenLayout dimensionCode={dimensionCode} presentation={p}>
      {shouldAnimate ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {inner}
        </motion.div>
      ) : (
        inner
      )}
    </BlockScreenLayout>
  );
}
