"use client";

import { Check, LayoutGrid, Route, Users } from "lucide-react";
import { useState } from "react";

import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { Reveal, RevealGroup } from "@/components/marketing/fx/Reveal";
import { SpotlightCard } from "@/components/marketing/fx/SpotlightCard";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { useMarketingCopy } from "@/components/marketing/LanguageProvider";
import { BrowserFrame, PhoneFrame } from "@/components/marketing/platform/DeviceFrames";
import { cn } from "@/lib/utils";

const FEATURE_SHOTS: Record<string, { desk: string; deskH: number; mob: string }> = {
  // Colaborador (roleIndex 0).
  dimension: { desk: "desk-dimension", deskH: 1760, mob: "mob-dimension" },
  ruta: { desk: "desk-ruta", deskH: 1180, mob: "mob-ruta" },
  modulo: { desk: "desk-modulo", deskH: 1000, mob: "mob-modulo" },
  plan: { desk: "desk-plan", deskH: 1320, mob: "mob-plan" },
  // Líder (roleIndex 1) — recorrido del rol: 1) "Mi Equipo" (head con las
  // personas a cargo), 2) la ficha del colaborador en /team/[id] (estados por
  // dimensión + paths asignados), 3) la sección de comportamientos y feedback
  // dentro de esa misma ficha.
  feedback: { desk: "desk-equipo", deskH: 1720, mob: "mob-equipo" },
  recomendaciones: { desk: "desk-recomendaciones", deskH: 660, mob: "mob-recomendaciones" },
  revision: { desk: "desk-revision", deskH: 1050, mob: "mob-revision" },
  // RRHH (roleIndex 2) — ídem: cada card recorta la sección del Panel RRHH
  // que le corresponde. La 4ta ("Todo es crecimiento medible") es una
  // declaración de cierre sin captura.
  "progreso-equipo": { desk: "desk-progreso-equipo", deskH: 1050, mob: "mob-progreso-equipo" },
  "herramientas-crecimiento": { desk: "desk-herramientas-crecimiento", deskH: 1040, mob: "mob-herramientas-crecimiento" },
  dashboards: { desk: "desk-dashboards", deskH: 1040, mob: "mob-dashboards" },
};

const VIEW_ICONS = [
  <Route key="c" size={20} strokeWidth={1.8} className="text-hg-green" aria-hidden />,
  <Users key="l" size={20} strokeWidth={1.8} className="text-hg-amber-600" aria-hidden />,
  <LayoutGrid key="r" size={20} strokeWidth={1.8} className="text-hg-orange" aria-hidden />,
];

const ROLE_ACCENT = ["#a8c4a0", "#e8a030", "#f3a57c"];

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

/**
 * /plataforma — recorrido de producto. Wireframe: "Recorrido · Desktop/Mobile
 * · parte 1" (Design/). Mismas secciones en ambos anchos; desktop usa marcos
 * de navegador y composiciones de varios teléfonos, mobile un teléfono por
 * sección. Las pantallas son capturas estáticas dark-glass (así se ve la app)
 * con datos de ejemplo — sin llamadas a la API.
 */
export function PlatformLanding() {
  const copy = useMarketingCopy();
  const c = copy.plataforma;
  const alts = copy.alts;
  // Las 3 tarjetas "Tres vistas" son toggles: eligen qué set de funcionalidades
  // (Colaborador / Líder / RRHH) se muestra en las secciones de abajo.
  const [activeRole, setActiveRole] = useState(0);
  const roleFeatures = c.features.filter((f) => f.roleIndex === activeRole);

  return (
    <div className="flex flex-col">
      {/* Hero — texto a la izquierda, capturas a la derecha (mismo patrón de
          las secciones 01–0N de abajo). Antes el mockup iba centrado y APILADO
          debajo del texto: un bloque de 640px que dejaba un salto brusco con
          Hugie justo debajo. */}
      <section className="mx-auto w-full max-w-marketing px-5 pb-16 pt-28 md:px-8 md:pb-20 md:pt-32">
        <div className="flex flex-col items-center gap-10 md:flex-row md:items-center md:justify-between md:gap-12 lg:gap-16">
          <div className="flex flex-col items-center gap-5 text-center md:w-[460px] md:shrink-0 md:items-start md:text-left">
            <Reveal variant="left">
              <p className="eyebrow eyebrow-accent m-0">{c.hero.eyebrow}</p>
            </Reveal>
            <WordReveal
              text={c.hero.title}
              as="h1"
              className="display m-0 text-[40px] leading-[0.98] text-fg sm:text-6xl md:text-[56px] lg:text-[64px]"
            />
            <Reveal variant="left" delay={0.3}>
              <p className="m-0 max-w-[480px] text-base leading-relaxed text-fg-muted md:text-lg">{c.hero.body}</p>
            </Reveal>
            <Reveal variant="left" delay={0.4} className="flex flex-wrap justify-center gap-3 md:justify-start">
              <CtaLink href="/contacto">{c.hero.ctaPrimary}</CtaLink>
              <CtaLink href="#recorrido" variant="ghost" arrow={false}>
                {c.hero.ctaSecondary}
              </CtaLink>
            </Reveal>
          </div>

          {/* Mobile: un teléfono, debajo del texto */}
          <Reveal variant="scale" delay={0.5} className="fx-float md:hidden">
            <PhoneFrame shot="mob-home" alt={alts.mobHome} className="w-[260px]" eager />
          </Reveal>
          {/* Desktop: laptop + teléfono superpuesto, a la derecha del texto */}
          <Reveal
            variant="right"
            delay={0.2}
            className="relative hidden h-[420px] w-full md:block md:h-[460px] md:w-[57.6%] md:shrink-0 lg:h-[520px]"
          >
            <div className="fx-float-slow absolute left-0 top-0 w-[88%]">
              <BrowserFrame shot="desk-home" alt={alts.deskHome} height={1180} />
            </div>
            <div className="fx-float absolute right-0 top-[26%] w-[24%] min-w-[150px]">
              <PhoneFrame shot="mob-modulo" alt={alts.mobModulo} eager />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Hugie — sube antes del recorrido por rol (decisión post-lanzamiento
          de las 3 vistas/toggle): la teaser de producto va justo después del
          hero, antes de las secciones que agregamos para Colaborador/Líder/RRHH. */}
      <section className="mx-auto w-full max-w-marketing px-5 md:px-8">
        <Reveal variant="scale">
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
            <PhoneFrame shot="mob-onb-conversacion" alt={alts.mobOnbConversacion} className="w-[260px]" />
          </div>
          <div className="relative hidden h-[560px] flex-1 md:block lg:h-[640px]">
            <div className="fx-float-slow absolute left-0 top-[12%] w-[31%]">
              <PhoneFrame shot="mob-onb-hola" alt={alts.mobOnbHola} />
            </div>
            <div className="fx-float absolute left-[34%] top-0 z-10 w-[33%]">
              <PhoneFrame shot="mob-onb-conversacion" alt={alts.mobOnbConversacion} />
            </div>
            <div className="fx-float-slow absolute right-0 top-[16%] w-[31%]">
              <PhoneFrame shot="mob-onb-mapa" alt={alts.mobOnbMapa} />
            </div>
          </div>
        </div>
        </Reveal>
      </section>

      {/* Tres vistas — toggles de rol */}
      <section id="recorrido" className="mx-auto w-full max-w-marketing scroll-mt-24 px-5 py-16 md:px-8 md:py-20">
        <Reveal>
          <p className="eyebrow mb-5">{c.views.eyebrow}</p>
        </Reveal>
        <RevealGroup className="grid gap-4 md:grid-cols-3" step={0.1}>
          {c.views.items.map((v, i) => {
            const active = activeRole === i;
            return (
              <SpotlightCard
                key={v.title}
                role="button"
                tabIndex={0}
                aria-pressed={active}
                aria-controls="recorrido-features"
                onClick={() => setActiveRole(i)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setActiveRole(i);
                  }
                }}
                className={cn(
                  "flex h-full cursor-pointer items-start gap-3.5 p-5 text-left transition-all duration-300 md:p-6",
                  active ? "" : "opacity-70 hover:opacity-100",
                )}
                style={active ? { boxShadow: `0 0 0 2px ${ROLE_ACCENT[i]}` } : undefined}
              >
                <span
                  className="glass-fill flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl"
                  style={active ? { background: `${ROLE_ACCENT[i]}26` } : undefined}
                >
                  {VIEW_ICONS[i]}
                </span>
                <div className="flex flex-col gap-1">
                  <span className="text-[17px] font-bold text-fg">{v.title}</span>
                  <span className="text-sm leading-normal text-fg-muted">{v.desc}</span>
                </div>
              </SpotlightCard>
            );
          })}
        </RevealGroup>
      </section>

      {/* 01–0N — solo las features del rol activo. `key={activeRole}` remonta el
          bloque al cambiar de tab, para que el Reveal de cada card vuelva a animar. */}
      <div id="recorrido-features" key={activeRole}>
        {roleFeatures.map((f, i) => {
          const flip = i % 2 === 1;

          if (f.variant === "statement") {
            return (
              <section
                key={f.id}
                className="mx-auto mt-16 w-full max-w-marketing border-t border-border px-5 pt-12 md:mt-20 md:px-8 md:pt-16"
              >
                <Reveal variant="scale">
                  <div
                    className="glass-surface flex flex-col items-center gap-2 rounded-[32px] border p-10 text-center md:p-16"
                    style={{ borderColor: `${f.roleColor}59` }}
                  >
                    <span
                      className="inline-flex w-fit rounded-full px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-hg-ink"
                      style={{ background: f.roleColor }}
                    >
                      {f.role}
                    </span>
                    <p className="display m-0 mt-3 max-w-[720px] text-4xl leading-none text-fg md:text-[56px]">
                      {f.title}
                    </p>
                  </div>
                </Reveal>
              </section>
            );
          }

          const shot = FEATURE_SHOTS[f.id];
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
                <Reveal variant={flip ? "right" : "left"} className="flex flex-col gap-[18px] md:w-[440px] md:shrink-0">
                  <div className="flex items-center gap-3">
                    <span className="display text-[40px] leading-none text-fg/20 md:text-[56px]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span
                        className="inline-flex w-fit rounded-full px-[11px] py-[5px] text-[11px] font-bold uppercase tracking-[0.08em] text-hg-ink"
                        style={{ background: f.roleColor }}
                      >
                        {f.role}
                      </span>
                      <span className="text-[13px] font-bold uppercase tracking-[0.08em] text-fg-muted">{f.area}</span>
                    </div>
                  </div>
                  <h2 className="display m-0 text-4xl leading-none text-fg md:text-[52px]">{f.title}</h2>
                  <p className="m-0 text-base leading-relaxed text-fg-muted md:text-lg">{f.body}</p>
                  <Bullets items={f.bullets} />
                </Reveal>

                <Reveal variant="scale" delay={0.1} className="flex justify-center md:hidden">
                  <PhoneFrame shot={shot.mob} alt={`${f.area}: ${f.title}`} className="w-[260px]" />
                </Reveal>
                <Reveal
                  variant={flip ? "left" : "right"}
                  delay={0.1}
                  className="hidden md:block md:w-[57.6%] md:shrink-0"
                >
                  <BrowserFrame shot={shot.desk} height={shot.deskH} alt={`${f.area}: ${f.title}`} />
                </Reveal>
              </div>
            </section>
          );
        })}
      </div>

      <p className="mx-auto mt-14 px-5 text-center text-sm text-fg-muted">{c.demoNote}</p>
      <div className="h-16 md:h-24" />
    </div>
  );
}
