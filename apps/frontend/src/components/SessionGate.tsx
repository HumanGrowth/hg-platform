"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { apiRefresh } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Rehidrata el access token (en memoria) desde la cookie httpOnly al cargar.
 * Si no hay sesión válida, redirige a /login. El middleware ya bloqueó la ruta
 * por presencia de cookie; esto valida de verdad y carga el user.
 */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, hydrating, setSession, clear } = useAuthStore();
  const [ready, setReady] = React.useState(Boolean(accessToken));

  React.useEffect(() => {
    if (accessToken) {
      setReady(true);
      return;
    }
    let active = true;
    apiRefresh()
      .then((s) => {
        if (!active) return;
        setSession(s.user, s.accessToken);
        setReady(true);
      })
      .catch(() => {
        if (!active) return;
        clear();
        router.replace("/login");
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!ready || hydrating) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <EmptyRing label="Cargando tu espacio…" />
      </div>
    );
  }
  return <>{children}</>;
}
