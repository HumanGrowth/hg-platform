import { HeroDataPoint } from "@/components/modulos/blocks/HeroDataPoint";
import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { PencilCircle } from "@/components/ui/brand";
import { extractInlineStat } from "@/lib/markdown/markers";
import { detectHeroStat } from "@/lib/parsers/autoDetect";
import { cn } from "@/lib/utils";

import { useTemplateFrame } from "./frame-context";
import { SourceLine, STACK, TemplateDots, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

/**
 * Stat: número gigante (Anton, accent) + label + cuerpo. El dato sale, en orden,
 * de `hero_stat` → `[[stat: V · L]]` inline → auto-detect del cuerpo. Sin dato
 * cae a un cuerpo editorial (no rompe). En un marco apaisado el número y el texto
 * pasan a dos columnas; en retrato se apilan.
 */
export function StatTemplate({ block, body, dimensionCode, p }: TemplateProps) {
  const { landscape } = useTemplateFrame();
  const inline = block.hero_stat ? null : extractInlineStat(body);
  const hero = block.hero_stat ?? inline?.stat ?? detectHeroStat(body);
  const rest = inline ? inline.rest : body;
  const size = EMPHASIS[p.emphasis];

  const numberEl = hero && (
    <HeroDataPoint
      value={hero.value}
      label={hero.label}
      dimensionCode={dimensionCode}
      valueClassName={cn("font-display leading-none", size.stat, p.accent.text)}
      labelClassName={cn("font-heading text-[length:clamp(0.95rem,4cqmin,1.4rem)] font-medium", p.t.fg)}
    />
  );
  const number =
    numberEl && (p.motif === "pencil" ? <PencilCircle tone={p.accent.pencil} className="self-start">{numberEl}</PencilCircle> : numberEl);

  const text = (
    <>
      {rest && (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} fluid className={size.body}>
          {rest}
        </MarkdownBody>
      )}
      <SourceLine block={block} source={block.hero_stat?.source} p={p} />
      <TemplateDots p={p} />
    </>
  );

  return (
    <div className={STACK}>
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {landscape && number ? (
        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] items-center gap-[clamp(1.5rem,6cqmin,3rem)]">
          {number}
          <div className={STACK}>{text}</div>
        </div>
      ) : (
        <>
          {number}
          {text}
        </>
      )}
    </div>
  );
}
