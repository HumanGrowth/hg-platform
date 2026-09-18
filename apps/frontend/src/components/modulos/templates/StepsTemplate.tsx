import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { PencilCircle } from "@/components/ui/brand";
import { detectChecklistItems, numberedListStart } from "@/lib/parsers/autoDetect";
import { cn } from "@/lib/utils";

import { SourceLine, TemplateEyebrow, type TemplateProps } from "./parts";
import { EMPHASIS } from "./style";

interface Step {
  title: string;
  detail?: string | null;
}

/**
 * Steps: pasos numerados (máx 5). Vienen de `checklist_items` o, si no hay, de la
 * lista `1. 2. 3.` del cuerpo (en ese caso el cuerpo se recorta a la intro para no
 * duplicar los pasos). Es una pieza visual estática — a diferencia del look clásico
 * (`InteractiveChecklist`) no persiste checks. Sin pasos cae a cuerpo editorial.
 */
export function StepsTemplate({ block, body, p }: TemplateProps) {
  const explicit = block.checklist_items;
  const detected = explicit?.length ? null : detectChecklistItems(body);
  const steps: Step[] = explicit?.length ? explicit : (detected?.map((d) => ({ title: d.title })) ?? []);

  let intro = body;
  if (detected) {
    const start = numberedListStart(body);
    intro = start > 0 ? body.slice(0, start).trim() : "";
  }
  const size = EMPHASIS[p.emphasis];

  return (
    <div className="flex flex-col gap-5">
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {intro && (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} className={size.body}>
          {intro}
        </MarkdownBody>
      )}
      {steps.length > 0 && (
        <ol className="flex flex-col gap-4">
          {steps.slice(0, 5).map((step, i) => {
            const badge = (
              <span
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full font-display text-lg",
                  p.accent.bg,
                  p.accent.onBg,
                )}
              >
                {i + 1}
              </span>
            );
            return (
              <li key={`${i}-${step.title}`} className="flex items-start gap-4">
                {p.motif === "pencil" ? (
                  <PencilCircle tone={p.accent.pencil} strokeWidth={3} className="shrink-0 !px-2 !py-2">
                    {badge}
                  </PencilCircle>
                ) : (
                  <span className="shrink-0">{badge}</span>
                )}
                <div className="flex flex-col gap-1 pt-1">
                  <span className={cn("font-heading text-lg font-semibold leading-snug sm:text-xl", p.t.fg)}>
                    {step.title}
                  </span>
                  {step.detail && <span className={cn("font-sans text-base", p.t.muted)}>{step.detail}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <SourceLine block={block} p={p} />
    </div>
  );
}
