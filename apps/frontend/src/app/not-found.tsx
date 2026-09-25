import { CtaLink } from "@/components/marketing/fx/CtaLink";
import { Reveal } from "@/components/marketing/fx/Reveal";
import { WordReveal } from "@/components/marketing/fx/WordReveal";
import { HugieOrb } from "@/components/marketing/HugieOrb";
import { StandaloneShell } from "@/components/marketing/StandaloneShell";

export const metadata = { title: "Página no encontrada — Human Growth" };

/** 404 global: mismo estilo glass, con Hugie acompañando. */
export default function NotFound() {
  return (
    <StandaloneShell>
      <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-6 px-5 pb-20 text-center md:px-10">
        <Reveal variant="scale" className="fx-float w-[180px] md:w-[220px]">
          <HugieOrb state="reposo" className="w-full" />
        </Reveal>
        <Reveal>
          <p className="display m-0 bg-clip-text text-[96px] leading-none text-transparent md:text-[160px]" style={{
            backgroundImage: "linear-gradient(90deg,#e8530a,#c8a76e,#4a7a54,#a8c4a0,#7f9bb8,#e8a030)",
          }}>
            404
          </p>
        </Reveal>
        <WordReveal
          text="Esta página se perdió en el camino"
          as="h1"
          className="display m-0 text-[36px] leading-[0.98] text-fg md:text-6xl"
        />
        <Reveal delay={0.3}>
          <p className="mx-auto max-w-[520px] text-lg leading-relaxed text-fg-muted">
            No encontramos lo que buscás. Puede que el enlace haya cambiado o que la dirección tenga un error.
          </p>
        </Reveal>
        <Reveal delay={0.4} className="flex flex-wrap justify-center gap-3">
          <CtaLink href="/">Volver al inicio</CtaLink>
          <CtaLink href="/plataforma" variant="ghost" arrow={false}>
            Ver la plataforma
          </CtaLink>
        </Reveal>
      </div>
    </StandaloneShell>
  );
}
