import { HeroDataPoint } from "@/components/modulos/blocks/HeroDataPoint";
import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { PencilCircle } from "@/components/ui/brand";
import { extractInlineStat } from "@/lib/markdown/markers";
import { detectHeroStat } from "@/lib/parsers/autoDetect";
import { cn } from "@/lib/utils";

import { SourceLine, TemplateDots, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

/**
 * Stat: número gigante (Anton, accent) + label + cuerpo. El dato sale, en orden,
 * de `hero_stat` → `[[stat: V · L]]` inline → auto-detect del cuerpo. Sin dato
 * cae a un cuerpo editorial (no rompe).
 */
export function StatTemplate({ block, body, dimensionCode, p }: TemplateProps) {
  const inline = block.hero_stat ? null : extractInlineStat(body);
  const hero = block.hero_stat ?? inline?.stat ?? detectHeroStat(body);
  const rest = inline ? inline.rest : body;
  const size = EMPHASIS[p.emphasis];

  const number = hero && (
    <HeroDataPoint
      value={hero.value}
      label={hero.label}
      dimensionCode={dimensionCode}
      valueClassName={cn("font-display leading-none", size.stat, p.accent.text)}
      labelClassName={cn("font-heading text-base font-medium sm:text-lg", p.t.fg)}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {number &&
        (p.motif === "pencil" ? <PencilCircle tone={p.accent.pencil} className="self-start">{number}</PencilCircle> : number)}
      {rest && (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={size.body}>
          {rest}
        </MarkdownBody>
      )}
      <SourceLine block={block} source={block.hero_stat?.source} p={p} />
      <TemplateDots p={p} />
    </div>
  );
}
