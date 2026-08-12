import type { Block, QuizSubmitPayload, QuizSubmitResponse } from "@/lib/types";

import { QuizBlockView } from "./blocks/QuizBlockView";
import { ReflectionBlockView } from "./blocks/ReflectionBlockView";
import { TextBlockView } from "./blocks/TextBlockView";
import { VideoBlockView } from "./blocks/VideoBlockView";

export interface BlockRendererHandlers {
  isCompleted: boolean;
  onCompleteBlock: () => Promise<void>;
  onSubmitQuiz: (responses: QuizSubmitPayload[]) => Promise<QuizSubmitResponse>;
  onSubmitReflection: (text: string) => Promise<void>;
}

export interface BlockRendererProps extends BlockRendererHandlers {
  block: Block;
  /** Pilar de la unit — para la identidad visual por dimensión de los templates
   * (Sprint UI). Opcional: default primary si no se pasa. */
  dimensionCode?: string;
  /** Navegación del player (avanzar/cerrar) — la usa el botón "Finalizar" del
   * bloque de reflexión. Opcional (p.ej. el preview no navega). */
  onAdvance?: () => void;
}

/** Router polimórfico por block_type (TASK B-06) — 4 sub-vistas. */
export function BlockRenderer({ block, dimensionCode, onAdvance, ...handlers }: BlockRendererProps) {
  switch (block.block_type) {
    case "video_intro":
    case "video_teaching":
    case "video_closing":
      return (
        <VideoBlockView
          block={block}
          dimensionCode={dimensionCode}
          isCompleted={handlers.isCompleted}
          onCompleteBlock={handlers.onCompleteBlock}
        />
      );
    case "text_context":
    case "text_evidence":
    case "text_solution":
      return (
        <TextBlockView
          block={block}
          dimensionCode={dimensionCode}
          isCompleted={handlers.isCompleted}
          onCompleteBlock={handlers.onCompleteBlock}
        />
      );
    case "quiz_recall":
      return (
        <QuizBlockView
          block={block}
          dimensionCode={dimensionCode}
          isCompleted={handlers.isCompleted}
          onSubmitQuiz={handlers.onSubmitQuiz}
        />
      );
    case "reflection_write":
      return (
        <ReflectionBlockView
          block={block}
          dimensionCode={dimensionCode}
          isCompleted={handlers.isCompleted}
          onSubmitReflection={handlers.onSubmitReflection}
          onAdvance={onAdvance}
        />
      );
  }
}
