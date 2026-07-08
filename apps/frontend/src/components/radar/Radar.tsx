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

import { PILLAR_HEX, PILLAR_LABEL, type PillarCode, type RadarValues } from "./radar-model";

export type RadarState = "empty" | "filling" | "complete";
export type RadarSize = "mini" | "medium" | "large";

export interface RadarProps {
  /** Estado actual (última evaluación). */
  values: RadarValues;
  /**
   * Malla de crecimiento (objetivo/proyección) en verde, detrás del estado
   * actual. Opcional — sin ella el radar se ve como antes (backwards compat).
   */
  growth?: RadarValues;
  state: RadarState;
  size?: RadarSize;
  interactive?: boolean;
  animateOnMount?: boolean;
}

const ORDER: PillarCode[] = ["P1", "P2", "P3", "P4", "P5", "P6"];

const SIZE_PX: Record<RadarSize, number> = { mini: 120, medium: 300, large: 440 };
const FILL_MS = 5200;

const GREEN = "#4A7A54"; // --hg-green
const GREEN_100 = "#E3EBDF"; // --hg-green-100

export function Radar({
  values,
  growth,
  state,
  size = "medium",
  interactive = false,
  animateOnMount = false,
}: RadarProps) {
  const router = useRouter();
  const box = SIZE_PX[size];
  const showLabels = size !== "mini";
  const hasGrowth = growth != null && state !== "empty";

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
      growthValue: hasGrowth ? Math.round((growth?.[code] ?? 0) * progress) : 0,
    };
  });

  // Badge de pilar en cada eje: punto con el color del pilar + label corto
  // (reemplaza el texto "P#" · web-v3 decisión J).
  const PillarTick = (props: {
    payload: { value: PillarCode };
    x: number;
    y: number;
    textAnchor: string;
  }) => {
    const code = props.payload.value;
    return (
      <text
        x={props.x}
        y={props.y}
        textAnchor={props.textAnchor as "start" | "middle" | "end"}
        fontSize={12}
        fontWeight={600}
        style={interactive ? { cursor: "pointer" } : undefined}
        onClick={interactive ? () => router.push(`/radar/${code}` as never) : undefined}
        data-testid={`radar-axis-${code}`}
      >
        <tspan fill={PILLAR_HEX[code]}>● </tspan>
        <tspan fill="#6B7061">{PILLAR_LABEL[code]}</tspan>
      </text>
    );
  };

  return (
    <div
      className={state === "empty" ? "animate-pulse" : undefined}
      data-radar-state={state}
      data-radar-size={size}
    >
      <RadarChart width={box} height={box} data={data} outerRadius={showLabels ? "68%" : "72%"}>
        <PolarGrid stroke="rgba(26,26,26,0.12)" />
        {showLabels && <PolarAngleAxis dataKey="axis" tick={PillarTick as never} />}
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {hasGrowth && (
          <RechartsRadar
            name="growth"
            dataKey="growthValue"
            stroke={GREEN}
            fill={GREEN_100}
            fillOpacity={0.3}
            isAnimationActive={false}
          />
        )}
        <RechartsRadar
          name="score"
          dataKey="value"
          stroke="#E8530A"
          fill="#E8530A"
          fillOpacity={state === "empty" ? 0 : 0.25}
          isAnimationActive={false}
        />
      </RadarChart>

      {/* Leyenda de las dos mallas */}
      {hasGrowth && showLabels && (
        <div className="mt-2 flex justify-center gap-5 text-xs text-fg-muted">
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: GREEN }}
            />
            Crecimiento
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#E8530A" }}
            />
            Estado actual
          </span>
        </div>
      )}

      {/* Lista accesible (sr-only) con los valores — también la usan los tests. */}
      {state === "complete" && (
        <ul className="sr-only" aria-label="Valores por pilar">
          {data.map((d) => (
            <li key={d.code} data-testid={`radar-value-${d.code}`}>
              {d.label}: {d.value}
              {hasGrowth ? ` · crecimiento: ${d.growthValue}` : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
