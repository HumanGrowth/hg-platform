"use client";

import { ArrowLeft, CheckCircle2, Info, Plus, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AssignPathDialog } from "@/components/team/AssignPathDialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ApiError, apiGetTeamMemberDetail, apiUnassignPath } from "@/lib/api";
import { PILLARS } from "@/lib/pillars";
import { toast } from "@/lib/toast-store";
import type { TeamMemberDetail } from "@/lib/types";
import { formatRelativeTime } from "@/lib/utils";

const PILLAR_CODES = ["P1", "P2", "P3", "P4", "P5", "P6"] as const;
const PILLAR_NAME: Record<string, string> = Object.fromEntries(PILLARS.map((p) => [p.id, p.name]));
const PILLAR_DOT: Record<string, string> = Object.fromEntries(PILLARS.map((p) => [p.id, p.dot]));

export default function TeamMemberDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [status, setStatus] = React.useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [data, setData] = React.useState<TeamMemberDetail | null>(null);
  const [confirmCode, setConfirmCode] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      setData(await apiGetTeamMemberDetail(id));
      setStatus("ok");
    } catch (e) {
      setStatus(e instanceof ApiError && e.status === 404 ? "notfound" : "error");
    }
  }, [id]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function doUnassign(code: string) {
    try {
      await apiUnassignPath(id, code);
      toast(`Quitaste ${code} de su ruta`, "success");
      setConfirmCode(null);
      await load();
    } catch {
      toast("No se pudo quitar el path", "danger");
    }
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-app px-6 py-10">
        <div className="h-40 animate-pulse rounded-lg bg-bg-sunken" />
      </div>
    );
  }
  if (status === "notfound" || status === "error") {
    return (
      <div className="mx-auto max-w-app px-6 py-20 text-center">
        <p className="mb-4 font-sans text-md font-semibold text-fg">
          {status === "notfound" ? "Esta persona no está en tu equipo." : "No pudimos cargar el detalle."}
        </p>
        <Link href="/team" className="font-sans text-sm font-semibold text-orange-700">
          ← Volver a mi equipo
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const activeEnrollments = data.enrollments.filter((e) => e.is_active);

  return (
    <div className="mx-auto max-w-app px-6 py-8">
      <Link
        href="/team"
        className="mb-5 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-fg-muted hover:text-fg"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        Volver a mi equipo
      </Link>

      <div className="flex items-start gap-4">
        <Avatar name={data.full_name} size="lg" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Display variant="display-2" className="text-3xl">
              {data.full_name}
            </Display>
            {data.career_level && <Badge>{data.career_level}</Badge>}
            {data.job_title && <Badge variant="default">{data.job_title}</Badge>}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{data.email}</p>
          <p className={`mt-1 text-sm ${data.is_inactive ? "text-warning" : "text-fg-muted"}`}>
            Última actividad: {formatRelativeTime(data.last_active_at)}
          </p>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Progreso por dimensión */}
        <div className="rounded-lg border border-border bg-bg-raised p-5">
          <Eyebrow className="mb-4">Progreso por dimensión</Eyebrow>
          <div className="flex flex-col gap-3">
            {PILLAR_CODES.map((code) => {
              const rate = data.pillar_completion_rate[code] ?? 0;
              return (
                <div key={code} className="flex items-center gap-3">
                  <span className="w-6 font-mono text-xs text-fg-subtle">{code}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-sunken">
                    <div className={`h-full rounded-full ${PILLAR_DOT[code]}`} style={{ width: `${rate * 100}%` }} />
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-fg-muted">
                    {Math.round(rate * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Estados por pilar (assessment). Manager ve estados/vías, NO respuestas. */}
        {Object.keys(data.assessment_states ?? {}).length > 0 && (
          <div className="rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
            <Eyebrow className="mb-4">Estados por pilar</Eyebrow>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.assessment_states).map(([code, st]) => (
                <div key={code} className="rounded-md border border-border bg-cream-50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-fg-subtle">{code}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        st.source === "confirmed"
                          ? "bg-success-bg text-success"
                          : "bg-cream-200 text-fg-muted"
                      }`}
                    >
                      {st.source === "confirmed" ? "Confirmado" : "Estimación"}
                    </span>
                  </div>
                  <p className="mt-1 font-sans text-sm font-semibold text-fg">
                    {st.state_label ?? st.state ?? "—"}
                  </p>
                  {st.recaida_detected && (
                    <span className="mt-1 inline-block rounded-full bg-warning-bg px-2 py-0.5 text-xs font-semibold text-warning">
                      ⚠ Recaída — conversación recomendada
                    </span>
                  )}
                  {st.suggested_next_step && (
                    <p className="mt-1 text-xs text-fg-muted">{st.suggested_next_step}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paths asignados */}
        <div className="rounded-lg border border-border bg-bg-raised p-5">
          <Eyebrow className="mb-4">Paths asignados</Eyebrow>
          {activeEnrollments.length === 0 ? (
            <p className="text-sm text-fg-muted">Sin paths asignados todavía.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activeEnrollments.map((e) => (
                <li key={e.id} className="flex items-start gap-3">
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${PILLAR_DOT[e.career_path_code]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm font-semibold text-fg">
                      {e.career_path_code} · {e.career_path_name}
                    </p>
                    <p className="text-xs text-fg-subtle">
                      {e.assigned_by_name ? `asignado por ${e.assigned_by_name}` : "asignación automática"}
                      {" · "}
                      {formatRelativeTime(e.enrolled_at)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${e.career_path_code}`}
                    onClick={() => setConfirmCode(e.career_path_code)}
                    className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-bg-sunken hover:text-danger"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setAssignOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            <Plus size={16} strokeWidth={2} />
            Asignar nuevo path
          </button>
        </div>
      </div>

      {/* Cursos */}
      <section className="mt-8">
        <Eyebrow className="mb-3">Cursos en progreso ({data.courses_in_progress_list.length})</Eyebrow>
        {data.courses_in_progress_list.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin cursos en progreso.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.courses_in_progress_list.map((c) => (
              <li key={c.course_slug} className="flex items-center gap-3 text-sm text-fg">
                <span className="text-fg-subtle">•</span>
                <span className="flex-1">{c.course_title}</span>
                <span className="font-mono text-xs text-fg-muted">{Math.round(c.watch_pct)}%</span>
                <span className="text-xs text-fg-subtle">{formatRelativeTime(c.last_played_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <Eyebrow className="mb-3">Cursos completados ({data.courses_completed_list.length})</Eyebrow>
        {data.courses_completed_list.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin cursos completados todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.courses_completed_list.map((c) => (
              <li key={c.course_slug} className="flex items-center gap-3 text-sm text-fg">
                <CheckCircle2 size={15} strokeWidth={1.75} className="text-success" />
                <span className="flex-1">{c.course_title}</span>
                <span className="text-xs text-fg-subtle">{formatRelativeTime(c.last_played_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-8 flex items-start gap-2 rounded-lg border border-dashed border-border bg-bg-sunken px-4 py-3 text-sm text-fg-muted">
        <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        Assessments: pendiente — feature en desarrollo (placeholder hasta el motor B2-02/B2-03).
      </div>

      <Dialog
        open={confirmCode !== null}
        onClose={() => setConfirmCode(null)}
        title="Quitar path"
        description={confirmCode ? `¿Seguro que querés quitar ${confirmCode} de la ruta de ${data.full_name}?` : ""}
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmCode(null)}
            className="rounded-md border border-border px-5 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => confirmCode && void doUnassign(confirmCode)}
            className="rounded-md bg-danger px-5 py-2 font-sans text-sm font-semibold text-white hover:opacity-90"
          >
            Quitar
          </button>
        </div>
      </Dialog>

      <AssignPathDialog
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        userId={id}
        userName={data.full_name}
        alreadyAssignedCodes={activeEnrollments.map((e) => e.career_path_code)}
        onAssigned={() => void load()}
      />
    </div>
  );
}
