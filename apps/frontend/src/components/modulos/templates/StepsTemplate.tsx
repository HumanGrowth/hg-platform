import { MarkdownBody } from "@/components/modulos/blocks/MarkdownBody";
import { PencilCircle } from "@/components/ui/brand";
import { detectChecklistItems, numberedListStart } from "@/lib/parsers/autoDetect";
import { cn } from "@/lib/utils";

import { useTemplateFrame } from "./frame-context";
import { SourceLine, STACK, TemplateEyebrow, type TemplateProps } from "./parts";
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
  const { landscape } = useTemplateFrame();
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
    <div className={STACK}>
      <TemplateEyebrow label={block.eyebrow} p={p} />
      {intro && (
        <MarkdownBody variant={p.t.md} emphasis={p.emphasis} fluid className={size.body}>
          {intro}
        </MarkdownBody>
      )}
      {steps.length > 0 && (
        <ol className={cn("gap-[clamp(0.75rem,3.5cqmin,1.5rem)]", landscape ? "grid grid-cols-2" : "flex flex-col")}>
          {steps.slice(0, 5).map((step, i) => {
            const badge = (
              <span
                className={cn(
                  "flex h-[clamp(2rem,7cqmin,2.75rem)] w-[clamp(2rem,7cqmin,2.75rem)] items-center justify-center rounded-full font-display text-[length:clamp(1rem,4cqmin,1.4rem)]",
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
                  <span className={cn("font-heading text-[length:clamp(1.05rem,4.6cqmin,1.6rem)] font-semibold leading-snug", p.t.fg)}>
                    {step.title}
                  </span>
                  {step.detail && <span className={cn("font-sans text-[length:clamp(0.9rem,3.8cqmin,1.2rem)]", p.t.muted)}>{step.detail}</span>}
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
