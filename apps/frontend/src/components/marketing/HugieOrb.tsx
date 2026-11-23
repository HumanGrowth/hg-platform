import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

export const HUGIE_STATES = ["reposo", "escuchando", "pensando", "hablando", "celebrando"] as const;
export type HugieState = (typeof HUGIE_STATES)[number];

/**
 * Hugie — orbe oficial v2: cuenco de lino, remolino de color con las 6
 * dimensiones, vórtice de tres brazos que gira en sentido horario, ojo y
 * núcleo blancos, borde translúcido y especular arriba a la izquierda.
 * Fuente: artefacto "Hugie · Asistente oficial" (tableros Main y Estados).
 *
 * Solo CSS (estilos `.hugie*` en globals.css): cada estado cambia tempo,
 * pulso y luz, nunca la forma. Con prefers-reduced-motion queda quieto.
 * Decorativo por defecto (aria-hidden); con `label` se expone como imagen.
 */
export function HugieOrb({
  state = "reposo",
  size = 320,
  bare = false,
  label,
  className,
}: {
  state?: HugieState;
  /** Lado del orbe: px o cualquier longitud CSS (ej. `clamp(160px, 30vw, 300px)`). */
  size?: number | string;
  /** Sin cuenco, para avatares chicos (burbujas de chat). */
  bare?: boolean;
  label?: string;
  className?: string;
}) {
  const style = { "--s": typeof size === "number" ? `${size}px` : size } as CSSProperties;
  const a11y = label ? { role: "img", "aria-label": label } : { "aria-hidden": true };
  return (
    <div className={cn("hugie", `hugie--${state}`, bare && "hugie--bare", className)} style={style} {...a11y}>
      {bare ? null : (
        <>
          <div className="hugie-ring" />
          <div className="hugie-ring r2" />
        </>
      )}
      <div className="hugie-orb">
        <div className="hugie-swirl" />
        <div className="hugie-vortex">
          <div className="hugie-arm a1" />
          <div className="hugie-arm a2" />
          <div className="hugie-arm a3" />
        </div>
        <div className="hugie-eye" />
        <div className="hugie-core" />
        <div className="hugie-rim" />
        <div className="hugie-spec" />
        {bare ? null : <div className="hugie-glint" />}
      </div>
    </div>
  );
}
