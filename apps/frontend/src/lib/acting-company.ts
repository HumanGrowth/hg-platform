"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { clearActingOrg } from "@/lib/acting-org";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";

/**
 * "Gestionar empresa" para superadmin (Modo Admin · Fase 1). El superadmin
 * elige UNA empresa en /admin/companies y a partir de ahí gestiona TODO
 * (empresa, organizaciones, miembros, importación) reusando las mismas páginas
 * /admin/empresa/* que ve un company_admin — sin duplicar pantallas.
 *
 * Guardamos {id,name} en localStorage y el frontend lo pasa como `company_id`
 * a los endpoints /api/v1/company/* (que ya lo aceptan para superadmin). Un
 * company_admin nunca setea esto: sus llamadas van sin `company_id` y el
 * backend resuelve su propia empresa.
 */
export interface ActingCompany {
  id: string;
  name: string;
}

const KEY = "hg_acting_company";
const EVENT = "hg-acting-company-changed";

export function getActingCompany(): ActingCompany | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActingCompany) : null;
  } catch {
    return null;
  }
}

export function setActingCompany(company: ActingCompany): void {
  window.localStorage.setItem(KEY, JSON.stringify(company));
  // El scope de empresa manda: limpiamos el acting-org (dashboard) para no tener
  // dos contextos "actuar como" activos a la vez.
  clearActingOrg();
  window.dispatchEvent(new Event(EVENT));
}

export function clearActingCompany(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

interface ActingCompanyState {
  company: ActingCompany | null;
  /** false hasta leer localStorage post-mount; evita decidir con datos a medio cargar. */
  hydrated: boolean;
}

/**
 * Fuente única: lee el acting-company de localStorage post-mount y marca
 * `hydrated`. Arranca en `{null, false}` para no romper la hidratación SSR
 * (localStorage no existe en el server); recién tras montar refleja el valor real.
 */
function useActingCompanyState(): ActingCompanyState {
  const [state, setState] = React.useState<ActingCompanyState>({ company: null, hydrated: false });
  React.useEffect(() => {
    const sync = () => setState({ company: getActingCompany(), hydrated: true });
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return state;
}

/** Hook reactivo al acting company (se sincroniza entre componentes vía evento). */
export function useActingCompany(): ActingCompany | null {
  return useActingCompanyState().company;
}

/**
 * Resuelve el `company_id` efectivo para las páginas /admin/empresa/*:
 * - company_admin → `undefined` (el backend usa su propia empresa).
 * - superadmin con empresa elegida → su id.
 * - superadmin SIN empresa elegida → redirige al selector (/admin/companies).
 *
 * IMPORTANTE: el redirect solo ocurre DESPUÉS de hidratar el acting-company de
 * localStorage. Sin este guard, cada montaje de página rebota a /admin/companies
 * antes de leer la empresa ya seleccionada (bug del menú "Gestionando…").
 */
export function useScopedCompanyId(): { companyId: string | undefined; ready: boolean } {
  const user = useAuthStore((s) => s.user);
  const { company: acting, hydrated } = useActingCompanyState();
  const router = useRouter();
  const isSuper = user?.role === "superadmin";

  React.useEffect(() => {
    if (hydrated && isSuper && !acting) {
      toast("Elegí una empresa para gestionar.");
      router.replace("/admin/companies");
    }
  }, [hydrated, isSuper, acting, router]);

  if (isSuper) {
    return { companyId: acting?.id, ready: hydrated && Boolean(acting) };
  }
  return { companyId: undefined, ready: true };
}
