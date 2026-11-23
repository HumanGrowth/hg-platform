"use client";

import type { ReactNode } from "react";

import { DIM_COLORS } from "@/components/marketing/fx/dim-colors";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { type PeoplePhoto, PhotoFrame } from "@/components/marketing/people/PhotoFrame";
import { cn } from "@/lib/utils";

const STAT = "display text-[40px] leading-none text-fg";

/** Tres roles, una plataforma. Orden RRHH → Líder → Colaborador (D2). */
export function ThreePeople() {
  const copy = useMarketingCopy();
  const c = copy.humanize.threePeople;

  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <SectionHeader title={c.title} subtitle={c.body} />

      <div className="grid items-start gap-10 md:grid-cols-3 md:gap-6">
        <Person photo="persona-rrhh" alt={c.hr.alt} role={c.hr.role} body={c.hr.body} delay={0}>
          <div className="flex items-center gap-5">
            {c.hr.stats.map((s) => (
              <span key={s.label} className="flex flex-col">
                <span className={STAT}>{s.value}</span>
                <span className="text-[13px] text-fg">{s.label}</span>
              </span>
            ))}
          </div>
        </Person>

        <Person photo="persona-lider" alt={c.leader.alt} role={c.leader.role} body={c.leader.body} delay={0.1} className="md:mt-12">
          <div className="flex items-center gap-4">
            <span className={STAT}>{c.leader.stat.value}</span>
            <span className="text-[13px] text-fg">{c.leader.stat.label}</span>
          </div>
        </Person>

        <Person
          photo="persona-colaboradora"
          alt={c.collaborator.alt}
          role={c.collaborator.role}
          body={c.collaborator.body}
          delay={0.2}
          className="md:mt-24"
        >
          <div className="flex flex-col gap-2.5">
            {c.collaborator.bars.map((b) => (
              <div key={b.label} className="flex items-center gap-2.5">
                <span aria-hidden className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: DIM_COLORS[b.dim] }} />
                <span className="flex-1 text-[13px] text-fg">{b.label}</span>
                <span className="h-2 flex-[2] overflow-hidden rounded-sm border border-border bg-surface-card">
                  <span className="block h-full" style={{ width: `${b.value}%`, background: DIM_COLORS[b.dim] }} />
                </span>
              </div>
            ))}
            <span className="text-xs font-semibold text-fg-muted">{c.collaborator.more}</span>
          </div>
        </Person>
      </div>
      <p className="mt-12 text-xs font-medium text-fg-muted">{copy.humanize.sampleData}</p>
    </section>
  );
}

function Person({
  photo,
  alt,
  role,
  body,
  delay,
  className,
  children,
}: {
  photo: PeoplePhoto;
  alt: string;
  role: string;
  body: string;
  delay: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Reveal as="article" delay={delay} className={cn("flex flex-col gap-5", className)}>
      <div className="relative pb-16">
        <PhotoFrame photo={photo} alt={alt} sizes="(min-width: 768px) 30vw, 92vw" className="aspect-[4/5]" />
        <div className="glass-surface-strong absolute inset-x-4 bottom-0 px-5 py-4">{children}</div>
      </div>
      <h3 className="m-0 font-heading text-2xl font-semibold leading-tight text-fg">{role}</h3>
      <p className="m-0 max-w-[34ch] text-fg-muted">{body}</p>
    </Reveal>
  );
}
