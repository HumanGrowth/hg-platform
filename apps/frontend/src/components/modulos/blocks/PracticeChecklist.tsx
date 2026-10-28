"use client";

import { InteractiveChecklist } from "@/components/modulos/blocks/InteractiveChecklist";
import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { parsePracticeBody } from "@/lib/parsers/autoDetect";

/**
 * Cuerpo de un `text_reflection` ("Tu práctica"): intro, checklist interactivo de
 * prácticas a elegir (checks persistidos por bloque, "guardar en mi cuaderno") y la
 * pregunta de cierre. Si el cuerpo no trae `- [ ]`, cae a markdown normal.
 */
export function PracticeChecklist({
  body,
  blockId,
  dimensionCode,
}: {
  body: string;
  blockId: string;
  dimensionCode?: string;
}) {
  const parsed = parsePracticeBody(body);
  if (!parsed) return <MarkdownBody>{body}</MarkdownBody>;
  return (
    <div className="flex flex-col gap-4">
      {parsed.intro && <MarkdownBody>{parsed.intro}</MarkdownBody>}
      <InteractiveChecklist
        items={parsed.items.map((title) => ({ title }))}
        storageKey={blockId}
        dimensionCode={dimensionCode}
        source="reflection"
      />
      {parsed.outro && <MarkdownBody>{parsed.outro}</MarkdownBody>}
    </div>
  );
}
