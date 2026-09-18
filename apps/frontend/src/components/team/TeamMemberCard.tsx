"use client";

import { AlertTriangle, Award, Check, Compass, PartyPopper } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route as NextRoute } from "next";
import Link from "next/link";
import type * as React from "react";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { dimensionShortName } from "@/lib/dimension-styles";
import type { TeamMember } from "@/lib/types";
import { formatRelativeTime, formatShortDate } from "@/lib/utils";

/** Semáforo por persona (umbral 21d): activo ≤7d, en riesgo 8-21d, inactivo >21d, nunca. */
// El color semántico vive en el dot (no-texto, ≥3:1); el label va en color de
// texto normal: amber/verde/rojo como texto chico no llegan a 4.5:1 sobre las
// superficies glass (medido: warning ≈2:1 en light, success/danger ≈3:1 en dark).
function memberStatus(lastActive: string | null): { label: string; dot: string } {
  if (!lastActive) return { label: "Nunca entró", dot: "bg-fg-subtle" };
  const days = (Date.now() - new Date(lastActive).getTime()) / 86_400_000;
  if (days <= 7) return { label: "Activo", dot: "bg-success" };
  if (days <= 21) return { label: "En riesgo", dot: "bg-warning" };
  return { label: "Inactivo", dot: "bg-danger" };
}

/** Aviso dentro de la card: superficie inset + borde izquierdo semántico +
 * ícono coloreado; el texto va en color normal (contraste garantizado). */
function Notice({
  tone,
  icon: Icon,
  children,
}: {
  tone: "success" | "warning" | "danger";
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  const color = `var(--color-${tone})`;
  return (
    <div
      className="glass-inset mt-3 flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold text-fg"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <Icon size={13} strokeWidth={2} aria-hidden style={{ color }} />
      {children}
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: LucideIcon;
  value: React.ReactNode;
  label: string;
  tone: string;
}) {
  return (
    <div className="glass-inset flex flex-col items-center gap-0.5 rounded-lg px-2 py-2 text-center">
      <Icon size={16} strokeWidth={2} className={tone} aria-hidden />
      <span className="font-mono text-sm font-semibold text-fg">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-meta text-fg-muted">{label}</span>
    </div>
  );
}

export function TeamMemberCard({ member: m }: { member: TeamMember }) {
  const st = memberStatus(m.last_active_at);
  const started = m.courses_completed + m.courses_in_progress;
  const pct = started > 0 ? Math.round((m.courses_completed / started) * 100) : 0;

  return (
    <Link
      href={`/team/${m.id}` as NextRoute}
      className="glass-surface-strong glass-hover group block rounded-xl border border-border bg-bg-raised p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      <div className="flex items-start gap-4">
        <Avatar name={m.full_name} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-sans text-sm font-semibold text-fg">{m.full_name}</span>
            {m.career_level && <Badge>{m.career_level}</Badge>}
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            {m.email}
            {m.job_title ? ` · ${m.job_title}` : ""}
          </p>
        </div>
        <span className="glass-inset inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1">
          <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden />
          <span className="text-xs font-semibold text-fg">{st.label}</span>
        </span>
      </div>

      {/* Notificación: completó el 100% del contenido asignado — el manager
          tiene la decisión final sobre si aprueba la ruta (matriz de
          comportamientos), esto solo le avisa que ya puede revisar. */}
      {m.completed_assigned_content && (
        <Notice tone="success" icon={PartyPopper}>
          Completó las rutas asignadas — revisá su aprobación
        </Notice>
      )}

      {/* Due dates de módulos asignados — solo si hay algo que avisar. */}
      {(m.assignments_overdue > 0 || m.assignments_due_soon > 0) && (
        <Notice tone={m.assignments_overdue > 0 ? "danger" : "warning"} icon={AlertTriangle}>
          {m.assignments_overdue > 0
            ? `${m.assignments_overdue} ${m.assignments_overdue === 1 ? "módulo vencido" : "módulos vencidos"}`
            : `${m.assignments_due_soon} por vencer`}
          {m.next_assignment_due_at && (
            <span className="font-normal text-fg-muted">
              · próximo {formatShortDate(m.next_assignment_due_at)}
            </span>
          )}
        </Notice>
      )}

      {/* Progreso de módulos (completados / iniciados). */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-fg-muted">
          <span>Progreso de módulos</span>
          <span className="font-mono tabular-nums">
            {m.courses_completed}/{started}
          </span>
        </div>
        <Progress value={pct} label={`Progreso de ${m.full_name}`} />
      </div>

      {/* Stat strip: cursos completados, badges alcanzados, área en la que
          está trabajando (su actividad más reciente). */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={Check} value={m.courses_completed} label="completados" tone="text-success" />
        <Stat icon={Award} value={m.badges_unlocked_count} label="badges" tone="text-primary" />
        <Stat
          icon={Compass}
          value={m.current_focus_dimension ? dimensionShortName(m.current_focus_dimension) : "—"}
          label="en foco"
          tone="text-fg-muted"
        />
      </div>

      <p className="mt-3 text-xs text-fg-muted">
        Última actividad: {formatRelativeTime(m.last_active_at)}
      </p>
    </Link>
  );
}
