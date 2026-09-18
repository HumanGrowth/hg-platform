import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { HexIcon } from "@/components/ui/hex-icon";
import { PencilCircle } from "@/components/ui/brand";

import { SourceLine, TemplateDots, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

/** Tip: HexIcon de la dimensión + acción corta (headline `>>` o cuerpo). */
export function TipTemplate({ block, body, p }: TemplateProps) {
  const size = EMPHASIS[p.emphasis];
  const icon = <HexIcon pillar={p.careerPath} size={size.hex} />;
  return (
    <div className="flex flex-col gap-5">
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {p.motif === "pencil" ? (
        <PencilCircle tone={p.accent.pencil} className="self-start">
          {icon}
        </PencilCircle>
      ) : (
        <span className="self-start">{icon}</span>
      )}
      <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={size.body}>
        {body}
      </MarkdownBody>
      <SourceLine block={block} p={p} />
      <TemplateDots p={p} />
    </div>
  );
}
