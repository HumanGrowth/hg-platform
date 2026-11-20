"use client";

import Image from "next/image";

import { Reveal } from "@/components/marketing/fx/Reveal";
import { SectionHeader } from "@/components/marketing/fx/SectionHeader";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { PhotoFrame } from "@/components/marketing/people/PhotoFrame";

/**
 * "Detrás de la plataforma hay un equipo". Las tres fotos son de ambientación
 * (se rotula); el único retrato con nombre es el de Jorge. La frase del
 * fundador vive en Quote, así que acá va solo retrato + nombre (plan §4).
 * La ciudad queda fuera del copy hasta confirmarla.
 */
export function TeamBehind() {
  const c = useMarketingCopy().humanize.teamBehind;
  return (
    <section className="mx-auto w-full max-w-marketing px-5 py-16 md:px-8 md:py-24">
      <SectionHeader title={c.title} subtitle={c.body} />

      <div className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-12">
          <Reveal variant="scale" className="md:col-span-7">
            <PhotoFrame
              photo="equipo-sala-postit"
              alt={c.photos.salaPostit}
              sizes="(min-width: 768px) 58vw, 92vw"
              className="aspect-[16/10] md:aspect-auto md:h-[460px]"
            />
          </Reveal>
          <Reveal variant="scale" delay={0.1} className="md:col-span-5">
            <PhotoFrame
              photo="equipo-demo-day"
              alt={c.photos.demoDay}
              sizes="(min-width: 768px) 40vw, 92vw"
              className="aspect-[16/10] md:aspect-auto md:h-[460px]"
            />
          </Reveal>
        </div>
        <div className="grid gap-6 md:grid-cols-12">
          <Reveal variant="scale" className="md:col-span-4">
            <PhotoFrame
              photo="equipo-cafe"
              alt={c.photos.cafe}
              sizes="(min-width: 768px) 32vw, 92vw"
              className="aspect-[16/10] md:aspect-auto md:h-[320px]"
            />
          </Reveal>
          <Reveal variant="scale" delay={0.1} className="md:col-span-8">
            <figure className="glass-surface-strong m-0 flex h-full flex-col gap-6 p-4 sm:flex-row sm:items-center">
              <div className="relative aspect-[4/5] w-full max-w-[260px] flex-none overflow-hidden rounded-xl sm:w-[230px]">
                <Image
                  src="/marketing/mentors/jorge.jpg"
                  alt={c.founder.alt}
                  fill
                  sizes="(min-width: 640px) 230px, 92vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="flex flex-col gap-1 px-2 pb-2 sm:pb-0">
                <span className="font-heading text-2xl font-semibold leading-tight text-fg">{c.founder.name}</span>
                <span className="text-fg-muted">{c.founder.role}</span>
              </figcaption>
            </figure>
          </Reveal>
        </div>
      </div>
      <p className="mt-4 text-xs font-medium text-fg-muted">{c.caption}</p>
    </section>
  );
}
