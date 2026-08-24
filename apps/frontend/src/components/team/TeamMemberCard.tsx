"use client";

import { ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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

export function TeamMemberCard({ member: m }: { member: TeamMember }) {
  const st = memberStatus(m.last_active_at);
  return (
    <Link
      href={`/team/${m.id}` as Route}
      className="flex items-start gap-4 rounded-lg border border-border bg-bg-raised p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hg-amber"
    >
      <Avatar name={m.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-sm font-semibold text-fg">{m.full_name}</span>
          {m.career_level && <Badge>{m.career_level}</Badge>}
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${st.dot}`} aria-hidden />
            <span className={`text-xs font-semibold ${st.text}`}>{st.label}</span>
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-muted">
          {m.email}
          {m.job_title ? ` · ${m.job_title}` : ""}
        </p>
        <p className="mt-1 text-xs text-fg-muted">
          Última actividad: {formatRelativeTime(m.last_active_at)}
        </p>
        <p className="mt-1 text-xs text-fg-subtle">
          {m.courses_in_progress} en progreso · {m.courses_completed} completados ·{" "}
          {m.active_enrollments} {m.active_enrollments === 1 ? "ruta" : "rutas"}
        </p>
      </div>
      <ArrowRight size={18} strokeWidth={1.75} className="mt-1 shrink-0 text-fg-subtle" />
    </Link>
  );
}
