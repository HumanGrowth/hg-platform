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
  // El `user` del store puede estar desactualizado (p.ej. recién completó el
  // assessment y el store aún tiene has_completed_onboarding=false). No decidimos
  // el redirect de onboarding hasta que `/me` confirme el estado fresco — así se
  // evita el loop "termino el assessment → me manda de vuelta al assessment".
  const [meChecked, setMeChecked] = React.useState(false);

  // Gate del onboarding. El paso de **consentimiento** está OCULTO por ahora
  // (se saltea): se va directo al assessment inicial si falta completarlo.
  // `has_completed_onboarding` se decide con dato fresco de /me (meChecked).
  React.useEffect(() => {
    if (!ready || !requireOnboarding || !user || !meChecked) return;
    if (user.has_completed_onboarding === false) {
      router.replace("/onboarding/welcome" as never);
    }
  }, [ready, requireOnboarding, user, meChecked, router]);

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
      .catch(() => {})
      .finally(() => {
        if (active) setMeChecked(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  // En rutas gated por onboarding, esperar a que `/me` confirme el estado fresco
  // antes de renderizar (evita el flash de la app + el redirect con dato viejo).
  if (!ready || hydrating || (requireOnboarding && !meChecked)) {
    return (
      <div className="flex flex-1 items-center justify-center py-32">
        <EmptyRing label="Cargando tu espacio…" />
      </div>
    );
  }
  return <>{children}</>;
}
