import { Check, Play } from "lucide-react";

/**
 * Preview de un módulo dentro de un contenedor `relative overflow-hidden` (lo
 * dimensiona/redondea el padre). Prioridad: `poster_url` → primer frame del
 * video (`video_url#t=0.1`, sin descargar el video completo) → ícono.
 */
export function UnitThumbnail({
  posterUrl,
  videoUrl,
  completed = false,
  iconSize = 18,
}: {
  posterUrl: string | null;
  videoUrl: string | null;
  completed?: boolean;
  iconSize?: number;
}) {
  const media = posterUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={posterUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
  ) : videoUrl ? (
    <video
      src={`${videoUrl}#t=0.1`}
      muted
      playsInline
      preload="metadata"
      aria-hidden
      className="absolute inset-0 h-full w-full object-cover"
    />
  ) : null;

  if (media) {
    const Icon = completed ? Check : Play;
    return (
      <>
        {media}
        <span className="absolute inset-0 bg-black/30" aria-hidden />
        <Icon size={iconSize} strokeWidth={2} className="relative text-white" />
      </>
    );
  }
  return completed ? (
    <Check size={iconSize + 2} strokeWidth={2} className="text-success" />
  ) : (
    <Play size={iconSize} strokeWidth={1.75} />
  );
}
