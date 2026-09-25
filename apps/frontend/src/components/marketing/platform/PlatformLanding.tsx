"use client";

import { ArrowRight, Check, LayoutGrid, Route, Users } from "lucide-react";
import Link from "next/link";

import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { BrowserFrame, PhoneFrame } from "@/components/marketing/platform/DeviceFrames";
import { cn } from "@/lib/utils";

const FEATURE_SHOTS: Record<string, { desk: string; deskH: number; mob: string }> = {
  dimension: { desk: "desk-dimension", deskH: 1760, mob: "mob-dimension" },
  ruta: { desk: "desk-ruta", deskH: 1180, mob: "mob-ruta" },
  modulo: { desk: "desk-modulo", deskH: 1000, mob: "mob-modulo" },
  plan: { desk: "desk-plan", deskH: 1320, mob: "mob-plan" },
};

const VIEW_ICONS = [
  <Route key="c" size={20} strokeWidth={1.8} className="text-hg-green" aria-hidden />,
  <Users key="l" size={20} strokeWidth={1.8} className="text-hg-amber-600" aria-hidden />,
  <LayoutGrid key="r" size={20} strokeWidth={1.8} className="text-hg-orange" aria-hidden />,
];

function Bullets({ items }: { items: readonly string[] }) {
  return (
    <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
      {items.map((b) => (
        <li key={b} className="flex items-start gap-2.5 text-[15px] leading-normal text-fg md:text-base">
          <Check size={16} strokeWidth={2} className="mt-1 shrink-0 text-hg-green" aria-hidden />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}

const btnBase =
  "inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[15px] font-semibold whitespace-nowrap transition-colors";
const btnPrimary = "bg-fg text-bg hover:opacity-90";
const btnGhost = "glass-fill-strong text-fg hover:text-primary";

/**
 * /plataforma — recorrido de producto. Wireframe: "Recorrido · Desktop/Mobile
 * · parte 1" (Design/). Mismas secciones en ambos anchos; desktop usa marcos
 * de navegador y composiciones de varios teléfonos, mobile un teléfono por
 * sección. Las pantallas son capturas estáticas dark-glass (así se ve la app)
 * con datos de ejemplo — sin llamadas a la API.
 */
export function PlatformLanding() {
  const c = useMarketingCopy().plataforma;

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="mx-auto flex w-full max-w-marketing flex-col items-center gap-5 px-5 pt-28 text-center md:px-8 md:pt-32">
        <p className="eyebrow eyebrow-accent m-0">{c.hero.eyebrow}</p>
        <h1 className="display m-0 max-w-[1100px] text-[52px] leading-[0.98] text-fg md:text-[88px] lg:text-[104px] lg:leading-[0.95]">
          {c.hero.title}
        </h1>
        <p className="m-0 max-w-[760px] text-base leading-relaxed text-fg-muted md:text-xl">{c.hero.body}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/contacto" className={cn(btnBase, btnPrimary)}>
            {c.hero.ctaPrimary}
            <ArrowRight size={16} strokeWidth={1.8} aria-hidden />
          </Link>
          <a href="#recorrido" className={cn(btnBase, btnGhost)}>
            {c.hero.ctaSecondary}
          </a>
        </div>

        {/* Mobile: un teléfono */}
        <div className="mt-6 md:hidden">
          <PhoneFrame shot="mob-home" alt="Inicio de la app en el teléfono" className="w-[260px]" eager />
        </div>
        {/* Desktop: laptop + teléfono superpuesto */}
        <div className="relative mt-9 hidden h-[640px] w-full max-w-[1180px] md:block">
          <BrowserFrame
            shot="desk-home"
            alt="Inicio de la app: progreso por dimensión"
            height={1180}
            className="absolute left-0 top-0 w-[92.7%]"
          />
          <PhoneFrame
            shot="mob-modulo"
            alt="Player de módulo en el teléfono"
            className="absolute right-0 top-[140px] w-[22%] min-w-[200px]"
            eager
          />
        </div>
      </section>

      {/* Tres vistas */}
      <section id="recorrido" className="mx-auto w-full max-w-marketing scroll-mt-24 px-5 py-16 md:px-8 md:py-20">
        <p className="eyebrow mb-5">{c.views.eyebrow}</p>
        <div className="grid gap-4 md:grid-cols-3">
          {c.views.items.map((v, i) => (
            <div key={v.title} className="glass-surface-strong flex items-start gap-3.5 p-5 md:p-6">
              <span className="glass-fill flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl">
                {VIEW_ICONS[i]}
              </span>
              <div className="flex flex-col gap-1">
                <span className="text-[17px] font-bold text-fg">{v.title}</span>
                <span className="text-sm leading-normal text-fg-muted">{v.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hugie */}
      <section className="mx-auto w-full max-w-marketing px-5 md:px-8">
        <div className="glass-surface flex flex-col gap-9 rounded-[32px] border border-hg-amber/35 p-6 md:flex-row md:items-center md:gap-12 md:p-10">
          <div className="flex flex-col gap-4 md:w-[470px] md:shrink-0 md:gap-[18px]">
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-hg-amber px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-hg-ink">
                {c.hugie.tags[0]}
              </span>
              <span className="glass-fill-strong inline-flex rounded-full px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-fg">
                {c.hugie.tags[1]}
              </span>
            </div>
            <h2 className="display m-0 text-[40px] leading-[0.98] text-fg md:text-[64px]">
              {c.hugie.titlePre} <span className="text-hg-orange">{c.hugie.name}</span>
              {c.hugie.titlePost}
            </h2>
            <p className="m-0 text-base leading-relaxed text-fg-muted md:text-[19px]">{c.hugie.body}</p>
            <Bullets items={c.hugie.bullets} />
          </div>

          {/* Mobile: una pantalla · Desktop: tres teléfonos escalonados */}
          <div className="flex justify-center md:hidden">
            <PhoneFrame shot="mob-onb-conversacion" alt="Conversación con Hugie" className="w-[260px]" />
          </div>
          <div className="relative hidden h-[560px] flex-1 md:block lg:h-[640px]">
            <PhoneFrame
              shot="mob-onb-hola"
              alt="Hugie da la bienvenida"
              className="absolute left-0 top-[12%] w-[31%]"
            />
            <PhoneFrame
              shot="mob-onb-conversacion"
              alt="Conversación con Hugie"
              className="absolute left-[34%] top-0 z-10 w-[33%]"
            />
            <PhoneFrame
              shot="mob-onb-mapa"
              alt="Mapa inicial de las seis dimensiones"
              className="absolute right-0 top-[16%] w-[31%]"
            />
          </div>
        </div>
      </section>

      {/* 01–04 */}
      {c.features.map((f, i) => {
        const shot = FEATURE_SHOTS[f.id];
        const flip = i % 2 === 1;
        return (
          <section
            key={f.id}
            className="mx-auto mt-16 w-full max-w-marketing border-t border-border px-5 pt-12 md:mt-20 md:px-8 md:pt-16"
          >
            <div
              className={cn(
                "flex flex-col gap-8 md:items-center md:justify-between md:gap-[60px]",
                flip ? "md:flex-row-reverse" : "md:flex-row",
              )}
            >
              <div className="flex flex-col gap-[18px] md:w-[440px] md:shrink-0">
                <div className="flex items-center gap-3">
                  <span className="display text-[40px] leading-none text-fg/20 md:text-[56px]">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="inline-flex w-fit rounded-full bg-hg-sage px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-hg-ink">
                      {c.role}
                    </span>
                    <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">{f.area}</span>
                  </div>
                </div>
                <h2 className="display m-0 text-4xl leading-none text-fg md:text-[52px]">{f.title}</h2>
                <p className="m-0 text-base leading-relaxed text-fg-muted md:text-lg">{f.body}</p>
                <Bullets items={f.bullets} />
              </div>

              <div className="flex justify-center md:hidden">
                <PhoneFrame shot={shot.mob} alt={`${f.area}: ${f.title}`} className="w-[260px]" />
              </div>
              <BrowserFrame
                shot={shot.desk}
                height={shot.deskH}
                alt={`${f.area}: ${f.title}`}
                className="hidden md:block md:w-[57.6%] md:shrink-0"
              />
            </div>
          </section>
        );
      })}

      <p className="mx-auto mt-14 px-5 text-center text-sm text-fg-muted">{c.demoNote}</p>
      <div className="h-16 md:h-24" />
    </div>
  );
}
