import { Award, Flame, Layers, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Las 4 tarjetas de datos del colaborador — mismo set y mismo orden en Inicio
 * y Mi Perfil (antes cada pantalla mostraba una mezcla distinta de 3). Orden
 * fijado por Andy: módulos completados, badges alcanzados, actividad del mes,
 * días activo. La actividad se mide en BLOQUES completados (no hay minutos
 * reales de uso: ADR-0011), así que la tarjeta lo dice.
 */
export interface StatCardsRowProps {
  modulesCompleted: number;
  badgesUnlocked: number;
  /** Bloques completados en el mes (backend: `month_watch_minutes`, nombre heredado). */
  blocksThisMonth: number;
  /** Racha de días activos — la métrica disponible más cercana a "días activo". */
  daysActive: number;
  className?: string;
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: number;
  label: string;
}) {
  return (
    <Card
      glass="strong"
      className="flex flex-col items-center gap-1 bg-bg-raised text-center sm:flex-row sm:items-center sm:gap-3 sm:text-left"
    >
      <Icon size={22} strokeWidth={1.75} className="text-primary" aria-hidden />
      <div>
        <p className="font-mono text-2xl font-semibold text-fg">{value}</p>
        <p className="text-xs text-fg-muted">{label}</p>
      </div>
    </Card>
  );
}

export function StatCardsRow({
  modulesCompleted,
  badgesUnlocked,
  blocksThisMonth,
  daysActive,
  className,
}: StatCardsRowProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4", className)}>
      <StatCard icon={Trophy} value={modulesCompleted} label="modulos completados" />
      <StatCard icon={Award} value={badgesUnlocked} label="badges alcanzados" />
      <StatCard
        icon={Layers}
        value={blocksThisMonth}
        label={blocksThisMonth === 1 ? "bloque este mes" : "bloques este mes"}
      />
      <StatCard
        icon={Flame}
        value={daysActive}
        label={daysActive === 1 ? "día activo" : "días activo"}
      />
    </div>
  );
}
