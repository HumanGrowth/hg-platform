import Image from "next/image";

import { cn } from "@/lib/utils";

/** Fotos de ambientación del marketing (public/marketing/people, 1600 px de ancho). */
export type PeoplePhoto =
  | "hero-equipo"
  | "dia-1-escritorio"
  | "dia-2-colegas"
  | "dia-3-taller"
  | "dia-4-pizarra"
  | "persona-rrhh"
  | "persona-lider"
  | "persona-colaboradora"
  | "equipo-sala-postit";

/**
 * Foto con recorte fijo: el contenedor reserva el alto por aspect-ratio (sin
 * CLS) y `next/image` sirve el tamaño justo según `sizes`. Solo el Hero usa
 * `priority`; el resto carga lazy (default de next/image).
 */
export function PhotoFrame({
  photo,
  alt,
  sizes,
  priority = false,
  className,
  imgClassName,
}: {
  photo: PeoplePhoto;
  alt: string;
  sizes: string;
  priority?: boolean;
  /** Debe incluir el aspect-ratio (ej. `aspect-[4/3]`) o un alto explícito. */
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-surface-sunken", className)}>
      <Image
        src={`/marketing/people/${photo}.webp`}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", imgClassName)}
      />
    </div>
  );
}
