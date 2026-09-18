"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Plus, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { AssignPathDialog } from "@/components/team/AssignPathDialog";
import { BehaviorMatrixCard } from "@/components/team/BehaviorMatrixCard";
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
  apiListUserAssignments,
  apiListUserCustomPathAssignments,
  apiUnassignCustomPathFromUser,
  apiUnassignPath,
} from "@/lib/api";
import { DIMENSIONS_META, dimensionShortName, subPillarName } from "@/lib/dimension-styles";
import { toast } from "@/lib/toast-store";
import type { ModuleAssignment, MyPath, TeamMemberDetail, UserCustomPath } from "@/lib/types";
import { formatRelativeTime, formatShortDate } from "@/lib/utils";

const PILLAR_NAME: Record<string, string> = Object.fromEntries(
  DIMENSIONS_META.map((p) => [p.id, p.name]),
);

const PILLAR_DOT: Record<string, string> = Object.fromEntries(DIMENSIONS_META.map((p) => [p.id, p.dot]));

interface PillarAssignmentGroup {
  key: string;
  label: string;
  items: ModuleAssignment[];
}

/** Agrupa los `ModuleAssignment` (siempre CP) por pilar — "Paths asignados"
 * ya no lista módulos sueltos, solo bloques (corrección post-2.4: mismo
 * criterio que el picker de asignación, ModuleBlockAssignFields). */
function groupAssignmentsByPillar(assignments: ModuleAssignment[]): PillarAssignmentGroup[] {
  const map = new Map<string, ModuleAssignment[]>();
  for (const a of assignments) {
    const key = a.pillar_code ?? "otros";
    const items = map.get(key) ?? [];
    if (items.length === 0) map.set(key, items);
    items.push(a);
  }
  return [...map.entries()].map(([key, items]) => ({
    key,
    label: key === "otros" ? "Otros módulos" : subPillarName("CP", key),
    items,
  }));
}

export default function TeamMemberDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [status, setStatus] = React.useState<"loading" | "error" | "notfound" | "ok">("loading");
  const [data, setData] = React.useState<TeamMemberDetail | null>(null);
  const [confirmCode, setConfirmCode] = React.useState<string | null>(null);
  const [confirmCustomPath, setConfirmCustomPath] = React.useState<UserCustomPath | null>(null);
  const [confirmPillarGroup, setConfirmPillarGroup] = React.useState<PillarAssignmentGroup | null>(null);
  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignments, setAssignments] = React.useState<ModuleAssignment[]>([]);
  const [path, setPath] = React.useState<MyPath | null>(null);
  const [customPaths, setCustomPaths] = React.useState<UserCustomPath[]>([]);

  const load = React.useCallback(async () => {
    setStatus("loading");
    try {
      const [detail, assign, p, cps] = await Promise.all([
        apiGetTeamMemberDetail(id),
        apiListUserAssignments(id).catch(() => [] as ModuleAssignment[]),
        apiGetTeamMemberPath(id).catch(() => null),
        apiListUserCustomPathAssignments(id).catch(() => [] as UserCustomPath[]),
      ]);
      setData(detail);
      setAssignments(assign);
      setPath(p);
      setCustomPaths(cps);
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

  async function doUnassignCustomPath(customPathId: string) {
    try {
      await apiUnassignCustomPathFromUser(id, customPathId);
      toast("Quitaste la ruta personalizada", "success");
      setConfirmCustomPath(null);
      await load();
    } catch {
      toast("No se pudo quitar la ruta", "danger");
    }
  }

  async function doUnassignPillarGroup(group: PillarAssignmentGroup) {
    try {
      await Promise.all(group.items.map((a) => apiDeleteAssignment(a.id)));
      toast(`Quitaste ${group.label} de su ruta`, "success");
      setConfirmPillarGroup(null);
      await load();
    } catch {
      toast("No se pudo quitar el pilar", "danger");
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
  const pillarGroups = groupAssignmentsByPillar(assignments);

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
          <div className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
            <Eyebrow className="mb-4">Estados por dimensión</Eyebrow>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(data.assessment_states).map(([code, st]) => (
                <div key={code} className="glass-inset rounded-md p-3">
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

        {/* Paths asignados: un solo listado — pilares/skills de CP (ModuleAssignment,
            agrupados), rutas personalizadas (CustomPath) y pilares legacy
            (Enrollment, ya no se pueden crear nuevos acá pero se conservan los
            existentes). El botón "Asignar módulo" desapareció: "Asignar nuevo
            path" cubre ambos casos ahora (ver AssignPathDialog). */}
        <div className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-5 lg:col-span-2">
          <Eyebrow className="mb-4">Paths asignados</Eyebrow>
          {pillarGroups.length === 0 && activeEnrollments.length === 0 && customPaths.length === 0 ? (
            <p className="text-sm text-fg-muted">Sin paths asignados todavía.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {pillarGroups.map((g) => {
                const overdue = g.items.some(
                  (a) => a.due_date !== null && a.status !== "completed" && new Date(a.due_date) < new Date(),
                );
                const allCompleted = g.items.every((a) => a.status === "completed");
                const nextDue = g.items
                  .map((a) => a.due_date)
                  .filter((d): d is string => d !== null)
                  .sort()[0];
                return (
                  <li key={g.key} className="flex items-start gap-3">
                    {allCompleted ? (
                      <CheckCircle2 size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-success" />
                    ) : overdue ? (
                      <AlertTriangle size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
                    ) : (
                      <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-sm font-semibold text-fg">{g.label}</p>
                      <p className={`text-xs ${overdue ? "font-semibold text-danger" : "text-fg-subtle"}`}>
                        {g.items.length} módulo(s)
                        {nextDue && (overdue ? ` · venció ${formatShortDate(nextDue)}` : ` · vence ${formatShortDate(nextDue)}`)}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={`Quitar ${g.label}`}
                      onClick={() => setConfirmPillarGroup(g)}
                      className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-bg-sunken hover:text-danger"
                    >
                      <X size={16} strokeWidth={2} />
                    </button>
                  </li>
                );
              })}
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
              {customPaths.map((cp) => (
                <li key={cp.id} className="flex items-start gap-3">
                  <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-sm font-semibold text-fg">Ruta personalizada · {cp.name}</p>
                    {cp.description && <p className="text-xs text-fg-subtle">{cp.description}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label={`Quitar ${cp.name}`}
                    onClick={() => setConfirmCustomPath(cp)}
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

      {/* Progreso por área — mismo motor que "Mi Ruta" del colaborador
          (path_engine): completed/total reales por dimensión con contenido.
          Cubre el seguimiento de los módulos asignados (ya no hay una
          sección aparte de "Módulos asignados" — el detalle de due dates
          vive en "Paths asignados" arriba). */}
      {path && path.dimensions_progress.length > 0 && (
        <section className="mt-8">
          <Eyebrow className="mb-3">Progreso por dimensión</Eyebrow>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {path.dimensions_progress.map((d) => {
              const dpct = d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0;
              return (
                <div key={d.career_path_code} className="glass-surface-strong rounded-lg border border-border bg-bg-raised p-3">
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

      {/* Feedback del manager: matriz de comportamientos del pilar en curso —
          gate de aprobación del badge de nivel, no un componente del score
          (ver badges/progression.py `_manager_approved`). */}
      <div className="mt-8">
        <BehaviorMatrixCard userId={id} />
      </div>

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

      <Dialog
        open={confirmCustomPath !== null}
        onClose={() => setConfirmCustomPath(null)}
        title="Quitar ruta personalizada"
        description={
          confirmCustomPath
            ? `¿Seguro que querés quitar "${confirmCustomPath.name}" de la ruta de ${data.full_name}?`
            : ""
        }
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmCustomPath(null)}
            className="rounded-md border border-border px-5 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => confirmCustomPath && void doUnassignCustomPath(confirmCustomPath.id)}
            className="rounded-md bg-danger px-5 py-2 font-sans text-sm font-semibold text-white hover:opacity-90"
          >
            Quitar
          </button>
        </div>
      </Dialog>

      <Dialog
        open={confirmPillarGroup !== null}
        onClose={() => setConfirmPillarGroup(null)}
        title="Quitar pilar"
        description={
          confirmPillarGroup
            ? `¿Seguro que querés quitar "${confirmPillarGroup.label}" (${confirmPillarGroup.items.length} módulo(s)) de la ruta de ${data.full_name}?`
            : ""
        }
      >
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setConfirmPillarGroup(null)}
            className="rounded-md border border-border px-5 py-2 font-sans text-sm font-semibold text-fg hover:bg-bg-sunken"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => confirmPillarGroup && void doUnassignPillarGroup(confirmPillarGroup)}
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
        alreadyAssignedUnitIds={new Set(assignments.map((a) => a.learning_unit_id))}
        alreadyAssignedCustomPathIds={customPaths.map((cp) => cp.id)}
        onModulesAssigned={() => void load()}
        onCustomPathAssigned={() => void load()}
      />
    </div>
  );
}
