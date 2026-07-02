"use client";

import * as React from "react";

/**
 * "Ver como org" para superadmin (AC-01). El superadmin elige inspeccionar el
 * dashboard RRHH de una org; guardamos {id,name} en localStorage y el frontend
 * pasa ese org_id a los endpoints /admin/org/* (que ya lo aceptan para
 * superadmin). Solo lectura — las escrituras siguen usando la org real.
 */
export interface ActingOrg {
  id: string;
  name: string;
}

const KEY = "hg_acting_org";
const EVENT = "hg-acting-org-changed";

export function getActingOrg(): ActingOrg | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActingOrg) : null;
  } catch {
    return null;
  }
}

export function setActingOrg(org: ActingOrg): void {
  window.localStorage.setItem(KEY, JSON.stringify(org));
  window.dispatchEvent(new Event(EVENT));
}

export function clearActingOrg(): void {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVENT));
}

/** Hook reactivo al acting org (se actualiza entre componentes vía evento). */
export function useActingOrg(): ActingOrg | null {
  const [org, setOrg] = React.useState<ActingOrg | null>(null);
  React.useEffect(() => {
    setOrg(getActingOrg());
    const onChange = () => setOrg(getActingOrg());
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener(EVENT, onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return org;
}
