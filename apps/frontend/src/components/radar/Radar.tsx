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

import { PillarMetaphorPaths } from "@/components/modulos/PillarMetaphor";
import { dimensionByPillar } from "@/lib/dimensions";

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
  /**
   * Estado de la evaluación anterior (overlay histórico · TASK 6.3). Se dibuja
   * como polígono punteado neutro detrás del actual, para visualizar evolución.
   */
  previous?: RadarValues;
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
const NEUTRAL = "#6B7061"; // --hg-muted (overlay previo)

export function Radar({
  values,
  growth,
  previous,
  state,
  size = "medium",
  interactive = false,
  animateOnMount = false,
}: RadarProps) {
  const router = useRouter();
  const box = SIZE_PX[size];
  const showLabels = size !== "mini";
  const hasGrowth = growth != null && state !== "empty";
  const hasPrevious = previous != null && state !== "empty";

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
      // El overlay previo no "anima desde el centro" — es el punto de partida.
      previousValue: hasPrevious ? Math.round(previous?.[code] ?? 0) : 0,
    };
  });

  // Vértice: metáfora del pilar (line-art, color del pilar) + label corto.
  // Reemplaza al dot/marker anterior (TASK 6.1). Click/tap → /dimensiones/[code].
  const PillarTick = (props: {
    payload: { value: PillarCode };
    x: number;
    y: number;
    cx: number;
    cy: number;
    textAnchor: string;
  }) => {
    const { x, y, cx, cy, textAnchor } = props;
    const code = props.payload.value;
    const dim = dimensionByPillar(code);
    // Dirección radial (centro → vértice) para posicionar label hacia afuera.
    const dx = x - cx;
    const dy = y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const M = 20; // media caja de la metáfora (40px)
    const lx = x + ux * 30;
    const ly = y + uy * 30;
    // Baseline adaptativo: arriba/abajo/lados (TASK 6.2).
    const baseline = uy < -0.4 ? "auto" : uy > 0.4 ? "hanging" : "central";
    return (
      <g
        style={interactive ? { cursor: "pointer" } : undefined}
        onClick={interactive && dim ? () => router.push(`/dimensiones/${dim.code}` as never) : undefined}
        data-testid={`radar-axis-${code}`}
      >
        <title>
          {PILLAR_LABEL[code]}: {values[code] ?? 0}
        </title>
        <svg
          x={x - M}
          y={y - M}
          width={2 * M}
          height={2 * M}
          viewBox="0 0 120 120"
          fill="none"
          stroke={PILLAR_HEX[code]}
          strokeWidth={5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <PillarMetaphorPaths code={code} />
        </svg>
        <text
          x={lx}
          y={ly}
          textAnchor={textAnchor as "start" | "middle" | "end"}
          dominantBaseline={baseline}
          fontSize={12}
          fontWeight={600}
          fill={NEUTRAL}
        >
          {PILLAR_LABEL[code]}
        </text>
      </g>
    );
  };

  return (
    <div
      className={state === "empty" ? "animate-pulse" : undefined}
      data-radar-state={state}
      data-radar-size={size}
    >
      <RadarChart
        width={box}
        height={box}
        data={data}
        outerRadius={showLabels ? "60%" : "72%"}
        margin={showLabels ? { top: 40, right: 56, bottom: 40, left: 56 } : undefined}
      >
        <PolarGrid stroke="rgba(26,26,26,0.12)" />
        {showLabels && <PolarAngleAxis dataKey="axis" tick={PillarTick as never} />}
        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
        {hasPrevious && (
          <RechartsRadar
            name="previous"
            dataKey="previousValue"
            stroke={NEUTRAL}
            strokeDasharray="5 3"
            strokeWidth={2}
            fill="none"
            fillOpacity={0}
            isAnimationActive={false}
          />
        )}
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

      {/* Leyenda de las mallas */}
      {(hasGrowth || hasPrevious) && showLabels && (
        <div className="mt-2 flex flex-wrap justify-center gap-5 text-xs text-fg-muted">
          {hasGrowth && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: GREEN }}
              />
              Crecimiento
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: "#E8530A" }}
            />
            {hasPrevious ? "Ahora" : "Estado actual"}
          </span>
          {hasPrevious && (
            <span className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-0 w-4 border-t-2 border-dashed"
                style={{ borderColor: NEUTRAL }}
              />
              Última evaluación
            </span>
          )}
        </div>
      )}

      {/* Lista accesible (sr-only) con los valores — también la usan los tests. */}
      {state === "complete" && (
        <ul className="sr-only" aria-label="Valores por pilar">
          {data.map((d) => (
            <li key={d.code} data-testid={`radar-value-${d.code}`}>
              {d.label}: {d.value}
              {hasGrowth ? ` · crecimiento: ${d.growthValue}` : null}
              {hasPrevious ? ` · anterior: ${d.previousValue}` : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
