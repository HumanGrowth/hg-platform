"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { EmptyRing } from "@/components/EmptyRing";
import { apiMe, apiRefresh } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

/**
 * Rehidrata el access token (en memoria) desde la cookie httpOnly al cargar.
 * Si no hay sesión válida, redirige a /login. El middleware ya bloqueó la ruta
 * por presencia de cookie; esto valida de verdad y carga el user.
 */
export function SessionGate({
  children,
  requireOnboarding = false,
}: {
  children: React.ReactNode;
  /** Si el user tiene `has_completed_onboarding === false`, redirige al flujo. */
  requireOnboarding?: boolean;
}) {
  const router = useRouter();
  const { accessToken, hydrating, setSession, clear, user } = useAuthStore();
  const [ready, setReady] = React.useState(Boolean(accessToken));

  // Gatea onboarding sólo si el backend dice explícitamente que falta.
  React.useEffect(() => {
    if (ready && requireOnboarding && user?.has_completed_onboarding === false) {
      router.replace("/onboarding/welcome" as never);
    }
  }, [ready, requireOnboarding, user, router]);

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

  // Enriquecer el user con datos completos de /me (reports_count, job_title,
  // org_name) que el login/refresh (UserOut) no traen.
  React.useEffect(() => {
    if (!accessToken) return;
    let active = true;
    apiMe()
      .then((me) => {
        if (active) setSession(me, accessToken);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  if (!ready || hydrating) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <EmptyRing label="Cargando tu espacio…" />
      </div>
    );
  }
  return <>{children}</>;
}
