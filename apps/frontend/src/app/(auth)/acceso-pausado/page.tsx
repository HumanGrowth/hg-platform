"use client";

import { useRouter } from "next/navigation";

import { CompanyBlockedScreen } from "@/components/company/CompanyBlockedScreen";
import { apiLogout } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

/** Destino cuando la empresa del usuario está suspendida/terminada (ADR-0016). */
export default function AccesoPausadoPage() {
  const router = useRouter();
  const clear = useAuthStore((s) => s.clear);

  async function onLogout() {
    try {
      await apiLogout(); // borra la cookie httpOnly del refresh
    } catch {
      /* igual cerramos la sesión local */
    }
    clear();
    router.replace("/login");
  }

  return <CompanyBlockedScreen onLogout={onLogout} />;
}
