"use client";

import { useEffect, useId, useRef } from "react";

import { useShouldAnimate } from "@/lib/motion/useShouldAnimate";

export type HugieState = "reposo" | "celebrando";

/** Un color por dimensión de marca (RGB), ordenados por matiz para que la
 *  mezcla aditiva no ensucie. */
const COLS = [
  [242, 100, 25],
  [242, 160, 61],
  [232, 195, 106],
  [158, 209, 127],
  [79, 158, 99],
  [63, 166, 196],
] as const;

/** Cada estado reprograma el fluido para que "sienta" la acción. */
const CFG: Record<HugieState, Record<string, number>> = {
  reposo: { flow: 0.7, cyc: 0.14, turb: 0.8, rise: 0, spread: 0, bright: 1.0, pulseAmt: 0.04, pulseRate: 0.9, sparkAmt: 0.12 },
  celebrando: { flow: 1.5, cyc: 0.42, turb: 1.9, rise: 14, spread: 15, bright: 1.5, pulseAmt: 0.14, pulseRate: 3.2, sparkAmt: 0.32 },
};

const W = 160;
const H = 160;

function colAt(u: number): [number, number, number] {
  const k = ((u % 6) + 6) % 6;
  const i = Math.floor(k);
  const f = k - i;
  const a = COLS[i];
  const b = COLS[(i + 1) % 6];
  return [
    Math.round(a[0] + (b[0] - a[0]) * f),
    Math.round(a[1] + (b[1] - a[1]) * f),
    Math.round(a[2] + (b[2] - a[2]) * f),
  ];
}

const PLASMA = COLS.map((_, i) => ({ ph: i * 2.1, sp: 0.35 + i * 0.05, amp: 5 + (i % 3) * 2, off: (i - 2.5) * 4, cycleStart: i }));

function drawFrame(ctx: CanvasRenderingContext2D, t: number, cf: Record<string, number>) {
  const pulse = 1 + cf.pulseAmt * Math.sin(t * cf.pulseRate);
  ctx.clearRect(0, 0, W, H);
  ctx.globalCompositeOperation = "lighter";
  const baseY = H * 0.72 - cf.rise;
  PLASMA.forEach((d, p) => {
    for (let x = -30; x <= W + 30; x += 14) {
      const col = colAt((x / W) * 2.6 + t * cf.cyc + d.cycleStart);
      const nx = (x - W / 2) / (W * 0.62);
      const contour = (1 - nx * nx) * 20;
      const convec = Math.sin(x * 0.03 - t * 0.34 * cf.flow + d.ph) * 4 * cf.turb + Math.cos(x * 0.018 - t * 0.22 * cf.flow) * 3;
      const w = Math.sin(x * 0.02 - t * 0.34 * cf.flow) + Math.sin(x * 0.011 - t * 0.2 * cf.flow) * 0.6;
      const gravity = w > 0 ? w * 4 : w * 11;
      const indiv = Math.sin(x * 0.032 - t * d.sp * 1.3 * cf.flow + d.ph) * d.amp * 0.6 * cf.turb;
      const y = baseY + d.off + contour + gravity + convec + indiv - cf.spread * (1 - nx * nx);
      const depth = Math.min(1, Math.max(0, (y - H * 0.58) / (H * 0.36)));
      const r = 26 + Math.sin(x * 0.05 + t + p) * 5 + depth * 12;
      const spark = 0.8 + cf.sparkAmt * Math.sin(x * 0.055 - t * 1.1 * cf.flow + p * 1.7);
      const a = (0.075 + depth * 0.055) * cf.bright * pulse * spark;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${a})`);
      g.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 6.2832);
      ctx.fill();
    }
  });
  // Confinar dentro del cristal: fade lateral + vertical.
  ctx.globalCompositeOperation = "destination-in";
  const hg = ctx.createLinearGradient(0, 0, W, 0);
  hg.addColorStop(0, "rgba(255,255,255,0)");
  hg.addColorStop(0.16, "#fff");
  hg.addColorStop(0.84, "#fff");
  hg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, W, H);
  const vg = ctx.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0.46, "rgba(255,255,255,0)");
  vg.addColorStop(0.66, "#fff");
  vg.addColorStop(0.95, "#fff");
  vg.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
}

/**
 * Hugie — el conocimiento de la IA hecho materia: una esfera de cristal con
 * un plasma de luz que mezcla los 6 colores de las dimensiones. Referencia
 * visual: Artifacts/Renovación glassmorphic HG/Hugie.dc.html (se porta la
 * receta, no el runtime del .dc.html). Solo decorativo: aria-hidden.
 *
 * Perf: ~30fps, y el loop se pausa cuando el orbe sale del viewport. Con
 * reduced motion se pinta un único frame estático.
 */
export function HugieOrb({ state = "reposo", className }: { state?: HugieState; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldAnimate = useShouldAnimate();
  const cf = CFG[state];

  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;

    if (!shouldAnimate) {
      drawFrame(ctx, 4, cf);
      return;
    }

    let raf = 0;
    let last = 0;
    let visible = true;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (!visible || now - last < 33) return;
      last = now;
      drawFrame(ctx, now / 1000, cf);
    };
    raf = requestAnimationFrame(loop);

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    io.observe(cv);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [cf, shouldAnimate]);

  const celebrando = state === "celebrando";
  const anim = shouldAnimate;

  return (
    <div
      aria-hidden
      className={`relative grid aspect-square place-items-center ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          width: "116%",
          height: "116%",
          background: celebrando
            ? "radial-gradient(circle, rgba(232,160,48,0.55), transparent 62%)"
            : "radial-gradient(circle, rgba(74,122,84,0.5), transparent 64%)",
          filter: "blur(11px)",
          animation: anim ? `hug-aura ${celebrando ? "1.8s" : "4s"} ease-in-out infinite` : undefined,
        }}
      />
      <div
        className="relative aspect-square w-[88%] rounded-full"
        style={{ animation: anim ? "hug-breathe 4s cubic-bezier(.45,0,.55,1) infinite" : undefined }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-full"
          style={{
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow:
              "inset 0 0 20px rgba(0,0,0,0.08), inset 0 2px 4px rgba(255,255,255,0.3), 0 30px 60px rgba(24,24,35,0.05)",
          }}
        >
          <div className="absolute inset-0" style={{ background: "rgba(250,243,232,0.16)" }} />
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="absolute inset-0 h-full w-full"
            style={{ filter: "blur(5px)" }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(38% 34% at 30% 26%, rgba(255,255,255,0.25), transparent 70%)" }}
          />
        </div>
        <svg viewBox="0 0 100 100" className="absolute inset-0 block h-full w-full overflow-visible">
          <defs>
            <radialGradient id={`gg${uid}`} cx="36%" cy="30%" r="72%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.12)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
            </radialGradient>
            <linearGradient id={`rg${uid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.9)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.28)" />
            </linearGradient>
          </defs>
          {celebrando ? (
            <circle
              cx="50"
              cy="50"
              r="46"
              fill="rgba(255,255,255,0.2)"
              style={{ animation: anim ? "hug-aura 1.6s ease-in-out infinite" : undefined }}
            />
          ) : null}
          <ellipse cx="37" cy="30" rx="16" ry="11" fill="rgba(255,255,255,0.45)" transform="rotate(-24 37 30)" />
          <circle cx="50" cy="50" r="46" fill={`url(#gg${uid})`} />
          <circle cx="50" cy="50" r="46" fill="none" stroke={`url(#rg${uid})`} strokeWidth="1" opacity="0.4" />
          {celebrando ? (
            <g fill="#E8A030">
              <path
                d="M12 20 l1.6 3.2 3.2 1.6 -3.2 1.6 -1.6 3.2 -1.6 -3.2 -3.2 -1.6 3.2 -1.6 z"
                className="hug-sparkle"
                style={{ animationDelay: "0s" }}
              />
              <path
                d="M88 14 l1.3 2.6 2.6 1.3 -2.6 1.3 -1.3 2.6 -1.3 -2.6 -2.6 -1.3 2.6 -1.3 z"
                fill="#4A7A54"
                className="hug-sparkle"
                style={{ animationDelay: "0.5s" }}
              />
              <path
                d="M90 82 l1.3 2.6 2.6 1.3 -2.6 1.3 -1.3 2.6 -1.3 -2.6 -2.6 -1.3 2.6 -1.3 z"
                className="hug-sparkle"
                style={{ animationDelay: "0.9s" }}
              />
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}
