"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";

/** Admin de org o superadmin (dashboard de la propia org: /admin/org).
 * Manager/colaborador: toast + redirect a /home. */
export function OrgAdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    if (user.role === "admin" || user.role === "superadmin") {
      setAllowed(true);
    } else {
      toast("No tenés acceso al panel de tu organización.", "danger");
      router.replace("/home");
    }
  }, [user, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
