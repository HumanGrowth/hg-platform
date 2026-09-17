"use client";

/**
 * Rutas de la empresa (FASE 2.3): curación de CustomPath por superadmin/
 * admin/company_admin. Empresa (scope=company) u Organización (scope=org),
 * con herencia — org-scope tiene precedencia sobre company-scope para esa
 * org (ver `paths/resolution.py`). Reusa el picker de units de
 * `AssignModulesModal` (mismo endpoint `apiListAssignableUnits`) y el roster
 * de `apiCompanyMembers` para la asignación puntual.
 */
import { ChevronDown, ChevronUp, Plus, Trash2, Users } from "lucide-react";
import * as React from "react";

import { CompanyAdminGate } from "@/components/CompanyAdminGate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input, Label } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useScopedCompanyId } from "@/lib/acting-company";
import {
  apiCompanyMembers,
  apiCompanyOrgs,
  apiCreateCustomPath,
  apiDeleteCustomPath,
  apiListAssignableUnits,
  apiListCustomPaths,
  apiSetCustomPathAssignments,
  apiSetCustomPathItems,
  apiUpdateCustomPath,
  ApiError,
} from "@/lib/api";
import { blocksFor, cpCatalog, cpLevels, CP_DIMENSION as CUSTOM_PATH_DIMENSION, type BlockMode, type ContentBlock } from "@/lib/cp-blocks";
import { subPillarName } from "@/lib/dimension-styles";
import { toast } from "@/lib/toast-store";
import type { AssignableUnit, CompanyMember, CompanyOrg, CustomPath, CustomPathScope } from "@/lib/types";
import { cn } from "@/lib/utils";

function RutasContent() {
  const { companyId, ready } = useScopedCompanyId();
  const [paths, setPaths] = React.useState<CustomPath[] | null>(null);
  const [orgs, setOrgs] = React.useState<CompanyOrg[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [itemsPath, setItemsPath] = React.useState<CustomPath | null>(null);
  const [membersPath, setMembersPath] = React.useState<CustomPath | null>(null);

  const load = React.useCallback(() => {
    if (!ready) return;
    apiListCustomPaths({ companyId })
      .then(setPaths)
      .catch(() => setPaths([]));
    apiCompanyOrgs(companyId)
      .then(setOrgs)
      .catch(() => setOrgs([]));
  }, [companyId, ready]);
  React.useEffect(load, [load]);

  async function toggleActive(path: CustomPath) {
    try {
      await apiUpdateCustomPath(path.id, { is_active: !path.is_active }, companyId);
      load();
    } catch {
      toast("No se pudo actualizar la ruta.", "danger");
    }
  }

  async function remove(path: CustomPath) {
    if (!confirm(`¿Eliminar "${path.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await apiDeleteCustomPath(path.id, companyId);
      toast("Ruta eliminada.", "success");
      load();
    } catch {
      toast("No se pudo eliminar la ruta.", "danger");
    }
  }

  if (!ready) return null;

  return (
    <main className="mx-auto w-full max-w-app px-5 py-10 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow accent>Panel HG</Eyebrow>
          <Display variant="display-3" className="mt-1">
            Rutas de la empresa
          </Display>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={18} strokeWidth={1.75} />
          Nueva ruta
        </Button>
      </div>

      <p className="mt-3 max-w-prose text-sm text-fg-muted">
        Una ruta agrupa módulos con un orden propio. Aplica a toda la <strong>Empresa</strong> o a una{" "}
        <strong>Organización</strong> puntual — si ambas existen para la misma org, la de Organización
        gana. Sin ruta custom, el colaborador sigue viendo la recomendación algorítmica de siempre.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {paths === null ? (
          <p className="text-sm text-fg-muted">Cargando…</p>
        ) : paths.length === 0 ? (
          <p className="text-sm text-fg-muted">Todavía no hay rutas creadas.</p>
        ) : (
          paths.map((p) => (
            <Card key={p.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-sans text-sm font-semibold text-fg">{p.name}</p>
                    <Badge variant={p.scope === "company" ? "info" : "default"}>
                      {p.scope === "company" ? "Toda la empresa" : p.org_name ?? "Organización"}
                    </Badge>
                    {!p.is_active && <Badge>Inactiva</Badge>}
                  </div>
                  {p.description && <p className="mt-1 text-xs text-fg-muted">{p.description}</p>}
                  <p className="mt-1 text-xs text-fg-subtle">
                    {p.items.length} módulo(s) · {p.assigned_member_count} miembro(s) asignado(s)
                    directamente
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => setItemsPath(p)}>
                    Módulos
                  </Button>
                  <Button variant="secondary" onClick={() => setMembersPath(p)}>
                    <Users size={16} strokeWidth={1.75} />
                    Asignar
                  </Button>
                  <button
                    type="button"
                    onClick={() => void toggleActive(p)}
                    className="rounded-md border border-border px-3 py-1.5 font-sans text-xs font-semibold text-fg hover:bg-bg-sunken"
                  >
                    {p.is_active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Eliminar ${p.name}`}
                    onClick={() => void remove(p)}
                    className="rounded-md p-2 text-fg-subtle hover:bg-bg-sunken hover:text-danger"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <CreatePathDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgs={orgs}
        companyId={companyId}
        onCreated={load}
      />
      <PathItemsDialog
        path={itemsPath}
        onClose={() => setItemsPath(null)}
        companyId={companyId}
        onSaved={load}
      />
      <PathMembersDialog
        path={membersPath}
        onClose={() => setMembersPath(null)}
        companyId={companyId}
        onSaved={load}
      />
    </main>
  );
}

function CreatePathDialog({
  open,
  onClose,
  orgs,
  companyId,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  orgs: CompanyOrg[];
  companyId: string | undefined;
  onCreated: () => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [scope, setScope] = React.useState<CustomPathScope>("company");
  const [orgId, setOrgId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setName("");
    setDescription("");
    setScope("company");
    setOrgId(orgs[0]?.id ?? "");
  }, [open, orgs]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiCreateCustomPath(
        {
          name: name.trim(),
          description: description.trim() || undefined,
          scope,
          org_id: scope === "org" ? orgId : undefined,
        },
        companyId,
      );
      toast("Ruta creada.", "success");
      onClose();
      onCreated();
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 422
          ? "Elegí una organización válida."
          : "No se pudo crear la ruta.",
        "danger",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Nueva ruta">
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <div>
          <Label htmlFor="path-name">Nombre</Label>
          <Input id="path-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="path-desc">Descripción (opcional)</Label>
          <Input id="path-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <fieldset>
          <legend className="mb-2 font-sans text-sm font-medium text-fg">Alcance</legend>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="radio"
                name="scope"
                checked={scope === "company"}
                onChange={() => setScope("company")}
              />
              Toda la empresa
            </label>
            <label className="flex items-center gap-2 text-sm text-fg">
              <input
                type="radio"
                name="scope"
                checked={scope === "org"}
                onChange={() => setScope("org")}
              />
              Una organización
            </label>
          </div>
        </fieldset>
        {scope === "org" && (
          <div>
            <Label htmlFor="path-org">Organización</Label>
            <Select id="path-org" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          </div>
        )}
        <div className="mt-2 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={submitting || !name.trim() || (scope === "org" && !orgId)}
          >
            {submitting ? "Creando…" : "Crear"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Une un unitId nuevo al bloque (por pilar) que le corresponde dentro de
 * `blocks`, creando el bloque al final si todavía no existe. Se usa para que
 * "En la ruta" siempre agrupe por pilar sin importar si se agregó en modo
 * Pilar o Skill (un skill puede cruzar varios pilares). */
function mergeUnitIntoPillarBlocks(
  blocks: ContentBlock[],
  unitId: string,
  catalog: AssignableUnit[],
): ContentBlock[] {
  if (blocks.some((b) => b.unitIds.includes(unitId))) return blocks;
  const pillarCode = catalog.find((u) => u.id === unitId)?.pillar_code ?? "otros";
  const idx = blocks.findIndex((b) => b.key === pillarCode);
  if (idx === -1) {
    return [
      ...blocks,
      {
        key: pillarCode,
        label: pillarCode === "otros" ? "Otros módulos" : subPillarName(CUSTOM_PATH_DIMENSION, pillarCode),
        unitIds: [unitId],
      },
    ];
  }
  const next = [...blocks];
  next[idx] = { ...next[idx], unitIds: [...next[idx].unitIds, unitId] };
  return next;
}

function PathItemsDialog({
  path,
  onClose,
  companyId,
  onSaved,
}: {
  path: CustomPath | null;
  onClose: () => void;
  companyId: string | undefined;
  onSaved: () => void;
}) {
  const [catalog, setCatalog] = React.useState<AssignableUnit[]>([]);
  const [pathBlocks, setPathBlocks] = React.useState<ContentBlock[]>([]);
  const [mode, setMode] = React.useState<BlockMode>("pillar");
  const [levelF, setLevelF] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!path) return;
    setMode("pillar");
    setLevelF("");
    apiListAssignableUnits().then((units) => {
      setCatalog(units);
      let blocks: ContentBlock[] = [];
      for (const it of path.items) blocks = mergeUnitIntoPillarBlocks(blocks, it.learning_unit_id, units);
      setPathBlocks(blocks);
    }).catch(() => setCatalog([]));
  }, [path]);

  const availableBlocks = blocksFor(cpCatalog(catalog, levelF), mode);
  const includedIds = new Set(pathBlocks.flatMap((b) => b.unitIds));
  const totalUnits = pathBlocks.reduce((n, b) => n + b.unitIds.length, 0);

  function addBlock(block: ContentBlock) {
    setPathBlocks((prev) => {
      let next = prev;
      for (const unitId of block.unitIds) next = mergeUnitIntoPillarBlocks(next, unitId, catalog);
      return next;
    });
  }
  function removeBlock(key: string) {
    setPathBlocks((prev) => prev.filter((b) => b.key !== key));
  }
  function moveBlock(index: number, dir: -1 | 1) {
    setPathBlocks((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  async function save() {
    if (!path) return;
    setSaving(true);
    try {
      await apiSetCustomPathItems(
        path.id,
        pathBlocks.flatMap((b) => b.unitIds.map((id) => ({ learning_unit_id: id, is_required: true }))),
        companyId,
      );
      toast("Módulos guardados.", "success");
      onSaved();
      onClose();
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 422
          ? "Algún módulo no está habilitado para esta empresa."
          : "No se pudieron guardar los módulos.",
        "danger",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!path) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Módulos de "${path.name}"`}
      className="max-w-2xl max-h-[90vh] overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        {/* Dos columnas en paralelo (apiladas en mobile) — cada una con su
            propio scroll interno, así el diálogo no crece verticalmente sin
            límite a medida que se agregan bloques a la ruta. */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex min-w-0 flex-col">
            <p className="mb-2 text-xs text-fg-subtle">
              Solo contenido de Carrera Profesional, por pilar o skill — las demás dimensiones se
              asignan según el score del assessment.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <div role="tablist" aria-label="Agrupar por" className="inline-flex rounded-md border border-border">
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "pillar"}
                  onClick={() => setMode("pillar")}
                  className={cn(
                    "px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
                    mode === "pillar" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
                  )}
                >
                  Pilar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === "skill"}
                  onClick={() => setMode("skill")}
                  className={cn(
                    "border-l border-border px-3 py-1.5 font-sans text-xs font-semibold transition-colors",
                    mode === "skill" ? "bg-hg-green-100 text-primary" : "text-fg-muted hover:bg-bg-sunken",
                  )}
                >
                  Skill
                </button>
              </div>
              <Select value={levelF} onChange={(e) => setLevelF(e.target.value)} className="w-auto">
                <option value="">Todos los niveles</option>
                {cpLevels(catalog).map((l) => (
                  <option key={l} value={l}>Nivel {l.replace("L", "")}</option>
                ))}
              </Select>
            </div>
            <p className="mb-2 mt-2 font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted">
              Disponibles ({availableBlocks.length})
            </p>
            <div className="h-72 overflow-y-auto rounded-md border border-border">
              {availableBlocks.length === 0 ? (
                <p className="p-3 text-sm text-fg-muted">Sin resultados.</p>
              ) : (
                availableBlocks.map((b) => {
                  const pending = b.unitIds.filter((id) => !includedIds.has(id));
                  const fullyIncluded = pending.length === 0;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      disabled={fullyIncluded}
                      onClick={() => addBlock(b)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 border-b border-border px-3 py-2 text-left last:border-0",
                        fullyIncluded ? "cursor-not-allowed opacity-50" : "hover:bg-bg-sunken",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 text-sm text-fg">{b.label}</span>
                        <span className="text-xs text-fg-muted">
                          {b.unitIds.length} módulo(s){fullyIncluded ? " · ya en la ruta" : ""}
                        </span>
                      </span>
                      <Plus size={14} strokeWidth={2} className="shrink-0 text-fg-subtle" />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col">
            <p className="font-sans text-xs font-semibold uppercase tracking-meta text-fg-muted">
              En la ruta ({pathBlocks.length} pilar(es) · {totalUnits} módulo(s))
            </p>
            <div className="mt-2 h-72 overflow-y-auto rounded-md border border-border">
              {pathBlocks.length === 0 ? (
                <p className="p-3 text-sm text-fg-muted">Sin pilares todavía — agregá desde "Disponibles".</p>
              ) : (
                <ul className="flex flex-col gap-1.5 p-1.5">
                  {pathBlocks.map((b, i) => (
                    <li
                      key={b.key}
                      className="glass-fill-strong flex items-center gap-2 rounded-md border border-border bg-surface-card px-2 py-2"
                    >
                      <div className="flex shrink-0 flex-col">
                        <button
                          type="button"
                          aria-label={`Subir ${b.label}`}
                          disabled={i === 0}
                          onClick={() => moveBlock(i, -1)}
                          className="text-fg-subtle hover:text-fg disabled:opacity-30"
                        >
                          <ChevronUp size={14} strokeWidth={2} />
                        </button>
                        <button
                          type="button"
                          aria-label={`Bajar ${b.label}`}
                          disabled={i === pathBlocks.length - 1}
                          onClick={() => moveBlock(i, 1)}
                          className="text-fg-subtle hover:text-fg disabled:opacity-30"
                        >
                          <ChevronDown size={14} strokeWidth={2} />
                        </button>
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 block text-sm text-fg">{b.label}</span>
                        <span className="text-xs text-fg-muted">{b.unitIds.length} módulo(s)</span>
                      </span>
                      <button
                        type="button"
                        aria-label={`Quitar ${b.label}`}
                        onClick={() => removeBlock(b.key)}
                        className="shrink-0 rounded-md p-1 text-fg-subtle hover:bg-bg-sunken hover:text-danger"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PathMembersDialog({
  path,
  onClose,
  companyId,
  onSaved,
}: {
  path: CustomPath | null;
  onClose: () => void;
  companyId: string | undefined;
  onSaved: () => void;
}) {
  const [members, setMembers] = React.useState<CompanyMember[]>([]);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [q, setQ] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!path) return;
    setQ("");
    setSelected(new Set());
    apiCompanyMembers(companyId).then(setMembers).catch(() => setMembers([]));
  }, [path, companyId]);

  const filtered = members.filter((m) => m.full_name.toLowerCase().includes(q.toLowerCase()));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    if (!path) return;
    setSaving(true);
    try {
      await apiSetCustomPathAssignments(path.id, [...selected], companyId);
      toast(`Ruta asignada a ${selected.size} miembro(s).`, "success");
      onSaved();
      onClose();
    } catch {
      toast("No se pudo asignar la ruta.", "danger");
    } finally {
      setSaving(false);
    }
  }

  if (!path) return null;

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Asignar "${path.name}" a miembros puntuales`}
      description="Esto reemplaza el set completo de miembros con asignación directa a esta ruta. Sin selección, la ruta sigue aplicando por su alcance (empresa/org)."
    >
      <div className="flex flex-col gap-3">
        <Input placeholder="Buscar persona…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="max-h-64 overflow-y-auto rounded-md border border-border">
          {filtered.length === 0 ? (
            <p className="p-3 text-sm text-fg-muted">Sin resultados.</p>
          ) : (
            filtered.map((m) => (
              <label
                key={m.id}
                className="flex cursor-pointer items-center gap-3 border-b border-border px-3 py-2 last:border-0 hover:bg-bg-sunken"
              >
                <input
                  type="checkbox"
                  checked={selected.has(m.id)}
                  onChange={() => toggle(m.id)}
                  className="h-4 w-4 shrink-0"
                />
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-sm text-fg">{m.full_name}</span>
                  <span className="text-xs text-fg-muted">{m.org_name}</span>
                </span>
              </label>
            ))
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-fg-muted">{selected.size} seleccionado(s)</span>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default function AdminRutasPage() {
  return (
    <CompanyAdminGate>
      <RutasContent />
    </CompanyAdminGate>
  );
}
