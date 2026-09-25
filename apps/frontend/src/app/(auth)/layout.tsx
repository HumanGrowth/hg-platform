import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { RotatingWord } from "@/components/marketing/fx/RotatingWord";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { PhoneFrame } from "@/components/marketing/platform/DeviceFrames";
import { StandaloneShell } from "@/components/marketing/StandaloneShell";

// Auth shell (login, accept-invite): mismo lenguaje glass del sitio público.
// Desktop: panel de marca a la izquierda + formulario glass a la derecha.
// Mobile: solo el formulario. Sin BetaBanner (eso vive en (app)).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <StandaloneShell>
      <div className="mx-auto grid w-full max-w-[1200px] items-center gap-12 px-5 pb-16 md:px-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <aside className="hidden lg:block">
          <Reveal>
            <p className="eyebrow eyebrow-accent mb-5">Human Growth</p>
          </Reveal>
          <WordReveal
            text="Tu crecimiento, dimensión por dimensión."
            as="h2"
            className="display m-0 text-[64px] leading-[0.96] text-fg"
          />
          <Reveal delay={0.35}>
            <p className="display mt-5 text-4xl leading-none text-fg">
              Crecé en <RotatingWord />
            </p>
          </Reveal>
          <Reveal variant="scale" delay={0.5} className="fx-float-slow mt-10">
            <PhoneFrame shot="mob-home" alt="Inicio de la app en el teléfono" className="w-[230px]" eager />
          </Reveal>
        </aside>

        <Reveal variant="scale" className="mx-auto w-full max-w-md">
          {children}
          <p className="mt-6 text-center text-sm text-fg-muted">
            ¿Querés conocer la plataforma?{" "}
            <CtaLink href="/plataforma" variant="ghost" arrow={false} className="!px-3 !py-1.5 text-sm">
              Ver el recorrido
            </CtaLink>
          </p>
        </Reveal>
      </div>
    </StandaloneShell>
  );
}
