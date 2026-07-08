/**
 * Watermark "Hï" del isotipo para los heros de marketing (decisión C, web-v3).
 * Se auto-recorta con un wrapper inset-0: el contenedor padre solo necesita
 * `relative` — NO overflow-hidden (recortaría la banda 100vw del landing-flow).
 */
export function HeroWatermark({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const src = variant === "dark" ? "/isotype/isotype-oscuro.svg" : "/isotype/isotype-claro.svg";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
    >
      <div className="absolute -right-16 top-10 opacity-[0.08]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="w-[clamp(360px,40vw,760px)] h-auto" />
      </div>
    </div>
  );
}
