"use client";

import { Check, CircleDashed, Route } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route as NextRoute } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { TeamMember } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

/** Semáforo por persona (umbral 21d): activo ≤7d, en riesgo 8-21d, inactivo >21d, nunca. */
function memberStatus(lastActive: string | null): { label: string; dot: string; text: string } {
  if (!lastActive) return { label: "Nunca entró", dot: "bg-fg-subtle", text: "text-fg-muted" };
  const days = (Date.now() - new Date(lastActive).getTime()) / 86_400_000;
  if (days <= 7) return { label: "Activo", dot: "bg-success", text: "text-success" };
  if (days <= 21) return { label: "En riesgo", dot: "bg-warning", text: "text-warning" };
  return { label: "Inactivo", dot: "bg-danger", text: "text-danger" };
}

function Stat({ icon: Icon, value, label, tone }: { icon: LucideIcon; value: number; label: string; tone: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-bg-sunken px-2 py-2 text-center">
      <Icon size={16} strokeWidth={2} className={tone} aria-hidden />
      <span className="font-mono text-sm font-semibold text-fg">{value}</span>
      <span className="text-[10px] uppercase tracking-meta text-fg-subtle">{label}</span>
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
      className="group block rounded-xl border border-border bg-bg-raised p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
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
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-sunken px-2.5 py-1">
          <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden />
          <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
        </span>
      </div>

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

      {/* Stat strip. */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat icon={Check} value={m.courses_completed} label="completados" tone="text-success" />
        <Stat icon={CircleDashed} value={m.courses_in_progress} label="en progreso" tone="text-warning" />
        <Stat icon={Route} value={m.active_enrollments} label="rutas" tone="text-primary" />
      </div>

      <p className="mt-3 text-xs text-fg-subtle">
        Última actividad: {formatRelativeTime(m.last_active_at)}
      </p>
    </Link>
  );
}
