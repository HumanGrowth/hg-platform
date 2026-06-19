"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { TeamMember } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

export function TeamMemberCard({ member: m }: { member: TeamMember }) {
  return (
    <Link
      href={`/team/${m.id}` as Route}
      className="flex items-start gap-4 rounded-lg border border-border bg-bg-raised p-5 transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange"
    >
      <Avatar name={m.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-sans text-sm font-semibold text-fg">{m.full_name}</span>
          {m.career_level && <Badge>{m.career_level}</Badge>}
          {m.is_inactive && (
            <Badge variant="warning" className="gap-1">
              <AlertTriangle size={12} strokeWidth={2} />
              Inactivo
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-fg-muted">
          {m.email}
          {m.job_title ? ` · ${m.job_title}` : ""}
        </p>
        <p className={`mt-1 text-xs ${m.is_inactive ? "text-warning" : "text-fg-muted"}`}>
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
