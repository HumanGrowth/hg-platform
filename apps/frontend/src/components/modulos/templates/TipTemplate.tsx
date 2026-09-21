import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { PencilCircle } from "@/components/ui/brand";
import { HexIcon } from "@/components/ui/hex-icon";
import { cn } from "@/lib/utils";

import { useTemplateFrame } from "./frame-context";
import { SourceLine, STACK, TemplateDots, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

/** Tip: HexIcon de la dimensión + acción corta. Apaisado: ícono a la izquierda. */
export function TipTemplate({ block, body, p }: TemplateProps) {
  const { landscape } = useTemplateFrame();
  const size = EMPHASIS[p.emphasis];
  const icon = <HexIcon pillar={p.careerPath} size={128} className={cn("h-auto", size.hex)} />;
  const iconEl =
    p.motif === "pencil" ? (
      <PencilCircle tone={p.accent.pencil} className="self-start">
        {icon}
      </PencilCircle>
    ) : (
      <span className="self-start">{icon}</span>
    );
  const text = (
    <>
      <MarkdownBody variant={p.t.md} emphasis={p.emphasis} fluid className={size.body}>
        {body}
      </MarkdownBody>
      <SourceLine block={block} p={p} />
      <TemplateDots p={p} />
    </>
  );

  return (
    <div className={STACK}>
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {landscape ? (
        <div className="flex items-center gap-[clamp(1.5rem,6cqmin,3rem)]">
          {iconEl}
          <div className={cn(STACK, "min-w-0 flex-1")}>{text}</div>
        </div>
      ) : (
        <>
          {iconEl}
          {text}
        </>
      )}
    </div>
  );
}
