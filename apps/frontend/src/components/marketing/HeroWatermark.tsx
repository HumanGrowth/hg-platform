/**
 * Watermark "Hï" del isotipo para los heros de marketing (decisión C, web-v3).
 * El contenedor padre debe ser `relative overflow-hidden`.
 */
export function HeroWatermark({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const src = variant === "dark" ? "/isotype/isotype-oscuro.svg" : "/isotype/isotype-claro.svg";
  return (
    <div className="absolute -right-16 top-10 opacity-[0.08] pointer-events-none hidden md:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" aria-hidden className="w-[clamp(360px,40vw,760px)] h-auto" />
    </div>
  );
}
