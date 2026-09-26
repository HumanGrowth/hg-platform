import { cn } from "@/lib/utils";

const BASE = "/marketing/plataforma";

/** Ventana de navegador con la captura desktop (1440 px de ancho) recortada arriba. */
export function BrowserFrame({
  shot,
  alt,
  height,
  className,
}: {
  shot: string;
  alt: string;
  /** Alto natural de la captura a 1440 de ancho (evita layout shift). */
  height: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[14px] border border-white/15 bg-[#1a1816] shadow-[0_40px_90px_rgba(0,0,0,0.5)]",
        className,
      )}
    >
      <div className="flex h-[34px] items-center gap-[7px] border-b border-white/[0.08] bg-[#100f0e] px-3.5">
        <span className="h-2.5 w-2.5 rounded-full bg-[#4a4541]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#4a4541]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#4a4541]" />
        <span className="ml-3.5 rounded-full bg-white/[0.06] px-3.5 py-1 text-[11px] text-[#8e8e8e]">
          app.humangrowth.io
        </span>
      </div>
      <div className="aspect-[691/499] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${BASE}/${shot}.webp`}
          width={1440}
          height={height}
          alt={alt}
          loading="lazy"
          className="block h-auto w-full"
        />
      </div>
    </div>
  );
}

/** Teléfono con bisel; el ancho lo define el contenedor (className). */
export function PhoneFrame({
  shot,
  alt,
  className,
  eager = false,
}: {
  shot: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[2.4rem] border border-white/[0.18] bg-[#0b0a09] p-[7px] shadow-[0_30px_70px_rgba(0,0,0,0.55)]",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`${BASE}/${shot}.webp`}
        width={780}
        height={1688}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        className="block h-auto w-full rounded-[2rem]"
      />
    </div>
  );
}
