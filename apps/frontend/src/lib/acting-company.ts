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

/** Hook reactivo al acting company (se sincroniza entre componentes vía evento). */
export function useActingCompany(): ActingCompany | null {
  const [company, setCompany] = React.useState<ActingCompany | null>(null);
  React.useEffect(() => {
    setCompany(getActingCompany());
    const onChange = () => setCompany(getActingCompany());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return company;
}

/**
 * Resuelve el `company_id` efectivo para las páginas /admin/empresa/*:
 * - company_admin → `undefined` (el backend usa su propia empresa).
 * - superadmin con empresa elegida → su id.
 * - superadmin SIN empresa elegida → redirige al selector (/admin/companies)
 *   y devuelve `ready: false` para que la página no dispare llamadas sin scope.
 */
export function useScopedCompanyId(): { companyId: string | undefined; ready: boolean } {
  const user = useAuthStore((s) => s.user);
  const acting = useActingCompany();
  const router = useRouter();
  const isSuper = user?.role === "superadmin";

  React.useEffect(() => {
    if (isSuper && !acting) {
      toast("Elegí una empresa para gestionar.");
      router.replace("/admin/companies");
    }
  }, [isSuper, acting, router]);

  if (isSuper) {
    return { companyId: acting?.id, ready: Boolean(acting) };
  }
  return { companyId: undefined, ready: true };
}
