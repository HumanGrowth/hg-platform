import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";

import { SourceLine, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

/** Editorial: Eyebrow + headline (`>>`) + cuerpo, el MosaicBand lo pone el layout. */
export function EditorialTemplate({ block, body, p }: TemplateProps) {
  return (
    <div className="flex flex-col gap-4">
      <TemplateEyebrow label={block.eyebrow} p={p} />
      <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={EMPHASIS[p.emphasis].body}>
        {body}
      </MarkdownBody>
      <SourceLine block={block} p={p} />
    </div>
  );
}
