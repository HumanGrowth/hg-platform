"use client";

import { AlertTriangle, Monitor, Smartphone, Tablet } from "lucide-react";
import * as React from "react";

import { Chip } from "@/components/ui/chip";
import type { NarrativeTone } from "@/lib/types";
import { cn } from "@/lib/utils";

export type PreviewDevice = "mobile" | "tablet" | "desktop";
export type ToneOption = NarrativeTone | "default";

const TONES: ToneOption[] = ["default", "active", "contemplative", "analytical", "warm"];
const TONE_LABEL: Record<ToneOption, string> = {
  default: "Default",
  active: "Activo",
  contemplative: "Contemplativo",
  analytical: "Analítico",
  warm: "Cálido",
};

const DEVICES: { id: PreviewDevice; label: string; icon: typeof Monitor }[] = [
  { id: "mobile", label: "Mobile", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "desktop", label: "Desktop", icon: Monitor },
];

export interface PreviewControlsProps {
  tone: ToneOption;
  onToneChange: (t: ToneOption) => void;
  device: PreviewDevice;
  onDeviceChange: (d: PreviewDevice) => void;
  reducedMotion: boolean;
  onReducedMotionChange: (v: boolean) => void;
  warnings: string[];
}

/**
 * Panel de control del preview del mentor (Sprint UI · TASK 15). Simula
 * `narrative_tone`, device y `prefers-reduced-motion`, y lista warnings de
 * contenido (hero_stat no detectado, checklist con >5 pasos, etc.).
 */
export function PreviewControls({
  tone,
  onToneChange,
  device,
  onDeviceChange,
  reducedMotion,
  onReducedMotionChange,
  warnings,
}: PreviewControlsProps) {
  return (
    <aside className="flex w-full flex-col gap-5 rounded-lg border border-border bg-bg-raised p-4 lg:w-72">
      <div className="flex flex-col gap-2">
        <span className="font-sans text-micro font-semibold uppercase tracking-meta text-fg-muted">Tono narrativo</span>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <Chip key={t} active={tone === t} onClick={() => onToneChange(t)} className="text-xs">
              {TONE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-sans text-micro font-semibold uppercase tracking-meta text-fg-muted">Dispositivo</span>
        <div className="flex gap-1.5">
          {DEVICES.map(({ id, label, icon: Icon }) => (
            <Chip key={id} active={device === id} onClick={() => onDeviceChange(id)} className="flex-1 justify-center gap-1 text-xs">
              <Icon size={14} strokeWidth={2} /> {label}
            </Chip>
          ))}
        </div>
      </div>

      <label className="flex items-center justify-between gap-3">
        <span className="font-sans text-sm text-fg">Reducir movimiento</span>
        <button
          type="button"
          role="switch"
          aria-checked={reducedMotion}
          onClick={() => onReducedMotionChange(!reducedMotion)}
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            reducedMotion ? "bg-primary" : "bg-border-strong",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform",
              reducedMotion ? "translate-x-[22px]" : "translate-x-0.5",
            )}
          />
        </button>
      </label>

      <div className="flex flex-col gap-2">
        <span className="flex items-center gap-1.5 font-sans text-micro font-semibold uppercase tracking-meta text-fg-muted">
          <AlertTriangle size={13} strokeWidth={2} /> Warnings de contenido
        </span>
        {warnings.length === 0 ? (
          <p className="text-xs text-success">Sin observaciones · todo listo.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-2 rounded-md bg-warning-bg px-2.5 py-2 text-xs text-warning">
                <AlertTriangle size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
