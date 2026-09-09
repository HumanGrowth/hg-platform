"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Plus, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AssignModulesModal } from "@/components/admin/AssignModulesModal";
import { AssignPathDialog } from "@/components/team/AssignPathDialog";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  ApiError,
  apiDeleteAssignment,
  apiGetTeamMemberDetail,
  apiGetTeamMemberPath,
  apiGetTeamMemberResults,
  apiListUserAssignments,
  apiUnassignPath,
} from "@/lib/api";
import { getDimensionInsight, type DimensionInsight } from "@/lib/dimension-insights";
import { DIMENSIONS_META, dimensionShortName } from "@/lib/dimension-styles";
import { DIMENSIONS } from "@/lib/dimensions";
import { radarValuesFromResults } from "@/lib/assessment-utils";
import { toast } from "@/lib/toast-store";
import type { DimensionResult, ModuleAssignment, MyPath, TeamMemberDetail } from "@/lib/types";
import { formatRelativeTime, formatShortDate } from "@/lib/utils";

const PILLAR_NAME: Record<string, string> = Object.fromEntries(
  DIMENSIONS_META.map((p) => [p.id, p.name]),
);

const PILLAR_DOT: Record<string, string> = Object.fromEntries(DIMENSIONS_META.map((p) => [p.id, p.dot]));

export default function TeamMemberDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [status, setStatus] = React.useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [data, setData] = React.useState<TeamMemberDetail | null>(null);
  const [confirmCode, setConfirmCode] = React.useState<string | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignModulesOpen, setAssignModulesOpen] = React.useState(false);
  const [assignments, setAssignments] = React.useState<ModuleAssignment[]>([]);
  const [path, setPath] = React.useState<MyPath | null>(null);
  const [results, setResults] = React.useState<DimensionResult[]>([]);
  // Plan de acción por dimensión — MISMO cálculo que /dimensiones/{code} le
  // muestra al propio colaborador (getDimensionInsight), no una versión
  // aparte para el manager.
  const [insights, setInsights] = React.useState<Map<string, DimensionInsight>>(new Map());

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [detail, assign, p, res] = await Promise.all([
        apiGetTeamMemberDetail(id),
        apiListUserAssignments(id).catch(() => [] as ModuleAssignment[]),
        apiGetTeamMemberPath(id).catch(() => null),
        apiGetTeamMemberResults(id).catch(() => [] as DimensionResult[]),
      ]);
      setData(detail);
      setAssignments(assign);
      setPath(p);
      setResults(res);

      const radar = res.length > 0 ? radarValuesFromResults(res) : {};
      const evaluated = DIMENSIONS.filter((d) =>
        res.some((r) => r.dimension_code === d.assessmentDimension || r.dimension_code.startsWith(d.careerPath)),
      );
      const entries = await Promise.all(
        evaluated.map(async (d) => [
          d.code,
          await getDimensionInsight({ dimension: d, results: res, score: radar[d.careerPath] ?? 0 }),
        ] as const),
      );
      setInsights(new Map(entries));

      setStatus("ok");
    } catch (e) {
      setStatus(e instanceof ApiError && e.status === 404 ? "notfound" : "error");
    }
  }, [id]);

  async function doRemoveAssignment(assignmentId: string) {
    try {
      await apiDeleteAssignment(assignmentId);
      toast("Quitaste la asignación", "success");
      await load();
    } catch {
      toast("No se pudo quitar la asignación", "danger");
    }
  }

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
        <Link href="/team" className="font-sans text-sm font-semibold text-primary">
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
        {/* Estados por dimensión (assessment). Manager ve estados/vías, NO respuestas.
            El progreso de CONTENIDO por dimensión vive más abajo, en "Progreso y
            próximos pasos" (path_engine) — antes había una segunda barra acá
            (dimension_completion_rate) con otra fuente, mostrando números
            distintos para lo mismo. */}
        {Object.keys(data.assessment_states ?? {}).length > 0 && (
          <div className="rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
            <Eyebrow className="mb-4">Estados por dimensión</Eyebrow>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.assessment_states).map(([code, st]) => (
                <div key={code} className="rounded-md border border-border bg-surface-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-fg">{dimensionShortName(code)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        st.source === "confirmed"
                          ? "bg-success-bg text-success"
                          : "bg-surface-sunken text-fg-muted"
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
        <div className="rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
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

      {/* Módulos asignados — due dates (cierre-beta TASK). Visible acá y en el
          semáforo de la tarjeta de /team; asignar reusa el mismo modal del panel
          de admin (ya autoriza manager sobre sus reportes). */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Eyebrow>Módulos asignados ({assignments.length})</Eyebrow>
          <button
            type="button"
            onClick={() => setAssignModulesOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 font-sans text-xs font-semibold text-fg hover:bg-bg-sunken"
          >
            <Plus size={14} strokeWidth={2} />
            Asignar módulo
          </button>
        </div>
        {assignments.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin módulos asignados todavía.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {assignments.map((a) => {
              const overdue =
                a.due_date !== null && a.status !== "completed" && new Date(a.due_date) < new Date();
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-bg-raised px-4 py-3 text-sm"
                >
                  {a.status === "completed" ? (
                    <CheckCircle2 size={15} strokeWidth={1.75} className="shrink-0 text-success" />
                  ) : overdue ? (
                    <AlertTriangle size={15} strokeWidth={1.75} className="shrink-0 text-danger" />
                  ) : (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-fg-subtle" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-fg">{a.unit_title}</span>
                  {a.due_date && (
                    <span className={`shrink-0 text-xs ${overdue ? "font-semibold text-danger" : "text-fg-muted"}`}>
                      {overdue ? "venció" : "vence"} {formatShortDate(a.due_date)}
                    </span>
                  )}
                  <button
                    type="button"
                    aria-label={`Quitar asignación de ${a.unit_title}`}
                    onClick={() => void doRemoveAssignment(a.id)}
                    className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-bg-sunken hover:text-danger"
                  >
                    <X size={14} strokeWidth={2} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Progreso por área — mismo motor que "Mi Ruta" del colaborador
          (path_engine): completed/total reales por dimensión con contenido. */}
      {path && path.dimensions_progress.length > 0 && (
        <section className="mt-8">
          <Eyebrow className="mb-3">Progreso por dimensión</Eyebrow>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {path.dimensions_progress.map((d) => {
              const dpct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
              return (
                <div key={d.career_path_code} className="rounded-lg border border-border bg-bg-raised p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-fg">
                      {PILLAR_NAME[d.career_path_code] ?? d.name}
                    </span>
                    <span className="font-mono text-fg-muted">
                      {d.total === 0 ? "—" : `${d.completed}/${d.total}`}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-sunken">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${dpct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {path.milestones.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {path.milestones.map((m) => (
                <span
                  key={m.badge_code}
                  className="inline-flex items-center gap-1 rounded-full bg-bg-sunken px-2.5 py-1 text-xs text-fg-muted"
                >
                  🏅 {m.badge_name} · faltan {m.units_remaining}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Próximos pasos — el MISMO contenido (consejos concretos) que
          /dimensiones/{code} le muestra a esta persona para su estado actual,
          calculado con getDimensionInsight — no las units crudas de la ruta
          (eso decía QUÉ video sigue, no en qué enfocarse; esto sí). Solo
          aparece para dimensiones evaluadas — sin evaluación no hay consejo
          que dar todavía. */}
      <section className="mt-8">
        <Eyebrow className="mb-3">Próximos pasos</Eyebrow>
        {insights.size === 0 ? (
          <p className="text-sm text-fg-muted">
            Todavía no hay próximos pasos para mostrar: {data.full_name.split(" ")[0]} no se evaluó
            en ninguna dimensión, o no habilitó que su manager vea sus estados.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {DIMENSIONS.filter((d) => insights.has(d.code)).map((d) => {
              const insight = insights.get(d.code);
              if (!insight || insight.tips.length === 0) return null;
              return (
                <div key={d.code} className="rounded-lg border border-border bg-bg-raised p-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${PILLAR_DOT[d.careerPath] ?? "bg-fg-subtle"}`} />
                    <p className="font-sans text-sm font-semibold text-fg">
                      {d.short} <span className="font-normal text-fg-muted">· {insight.headline}</span>
                    </p>
                  </div>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {insight.tips.map((tip) => (
                      <li key={tip} className="flex items-start gap-2 text-xs text-fg-muted">
                        <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-fg-subtle" />
                        <span className="min-w-0">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cursos. El header usa `courses_completed` (el conteo real, mismo que
          ve el propio colaborador) — `courses_completed_list` solo trae los 10
          más recientes, así que su `.length` podía mostrar un número menor y
          distinto acá abajo. */}
      <section className="mt-8">
        <Eyebrow className="mb-3">Cursos completados ({data.courses_completed})</Eyebrow>
        {data.courses_completed_list.length === 0 ? (
          <p className="text-sm text-fg-muted">Sin cursos completados todavía.</p>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {data.courses_completed_list.map((c) => (
                <li key={c.course_slug} className="flex items-center gap-3 text-sm text-fg">
                  <CheckCircle2 size={15} strokeWidth={1.75} className="text-success" />
                  <span className="flex-1">{c.course_title}</span>
                  <span className="text-xs text-fg-subtle">{formatRelativeTime(c.last_played_at)}</span>
                </li>
              ))}
            </ul>
            {data.courses_completed > data.courses_completed_list.length && (
              <p className="mt-2 text-xs text-fg-subtle">
                Mostrando los {data.courses_completed_list.length} más recientes.
              </p>
            )}
          </>
        )}
      </section>

      {/* La nota vieja decía "feature en desarrollo" — ya no es así, el motor de
          assessment existe y "Estados por dimensión" arriba lo muestra cuando
          hay datos + consentimiento. Esto solo explica el caso vacío. */}
      {Object.keys(data.assessment_states ?? {}).length === 0 && (
        <div className="mt-8 flex items-start gap-2 rounded-lg border border-dashed border-border bg-bg-sunken px-4 py-3 text-sm text-fg-muted">
          <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
          Sin estados de evaluación para mostrar: {data.full_name.split(" ")[0]} todavía no se evaluó,
          o no habilitó que su manager vea sus estados (Configuración → Privacidad).
        </div>
      )}

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

      <AssignModulesModal
        open={assignModulesOpen}
        onClose={() => setAssignModulesOpen(false)}
        userId={id}
        userName={data.full_name}
        alreadyAssignedIds={new Set(assignments.map((a) => a.learning_unit_id))}
        onAssigned={() => void load()}
      />
    </div>
  );
}
