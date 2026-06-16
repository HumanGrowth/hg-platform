"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  RadarChart,
} from "recharts";

export type PillarCode = "P1" | "P2" | "P3" | "P4" | "P5" | "P6";

export type RadarValues = Partial<Record<PillarCode, number>>;

export type RadarState = "empty" | "filling" | "complete";
export type RadarSize = "mini" | "medium" | "large";

export interface RadarProps {
  values: RadarValues;
  state: RadarState;
  size?: RadarSize;
  interactive?: boolean;
  animateOnMount?: boolean;
}

const ORDER: PillarCode[] = ["P1", "P2", "P3", "P4", "P5", "P6"];

export const PILLAR_LABEL: Record<PillarCode, string> = {
  P1: "Carrera",
  P2: "Propósito",
  P3: "Relaciones",
  P4: "Salud",
  P5: "Paz interior",
  P6: "Estabilidad",
};

const SIZE_PX: Record<RadarSize, number> = { mini: 120, medium: 300, large: 440 };
const FILL_MS = 5200;

export function Radar({
  values,
  state,
  size = "medium",
  interactive = false,
  animateOnMount = false,
}: RadarProps) {
  const router = useRouter();
  const box = SIZE_PX[size];
  const showLabels = size !== "mini";

  // Progreso de la animación de "llenado" (0 → 1). En complete arranca lleno.
  const [progress, setProgress] = React.useState(state === "filling" || animateOnMount ? 0 : 1);

  React.useEffect(() => {
    if (state !== "filling" && !animateOnMount) {
      setProgress(1);
      return;
    }
    let raf = 0;
    let start = 0;
    const tick = (ts: number) => {
      if (!start) start = ts;
      const p = Math.min(1, (ts - start) / FILL_MS);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [state, animateOnMount]);

  const data = ORDER.map((code) => {
    const target = state === "empty" ? 0 : values[code] ?? 0;
    return {
      code,
      axis: code,
      label: PILLAR_LABEL[code],
      value: Math.round(target * progress),
    };
  });

  const InteractiveTick = (props: {
    payload: { value: PillarCode };
    x: number;
    y: number;
    textAnchor: string;
  }) => (
    <text
      x={props.x}
      y={props.y}
      textAnchor={props.textAnchor as "start" | "middle" | "end"}
      fill="#6B7061"
      fontSize={12}
      fontWeight={600}
      style={{ cursor: "pointer" }}
      onClick={() => router.push(`/radar/${props.payload.value}` as never)}
    >
      {props.payload.value}
    </text>
  );

  const tickProp = interactive
    ? (InteractiveTick as never)
    : ({ fill: "#6B7061", fontSize: 12, fontWeight: 600 } as never);

  return (
    <div
      className={state === "empty" ? "animate-pulse" : undefined}
      data-radar-state={state}
      data-radar-size={size}
    >
      <RadarChart width={box} height={box} data={data} outerRadius="72%">
        <PolarGrid stroke="rgba(26,26,26,0.12)" />
        {showLabels && <PolarAngleAxis dataKey="axis" tick={tickProp} />}
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        <RechartsRadar
          name="score"
          dataKey="value"
          stroke="#E8530A"
          fill="#E8530A"
          fillOpacity={state === "empty" ? 0 : 0.25}
          isAnimationActive={false}
        />
      </RadarChart>

      {/* Lista accesible (sr-only) con los valores — también la usan los tests. */}
      {state === "complete" && (
        <ul className="sr-only" aria-label="Valores por pilar">
          {data.map((d) => (
            <li key={d.code} data-testid={`radar-value-${d.code}`}>
              {d.label}: {d.value}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
