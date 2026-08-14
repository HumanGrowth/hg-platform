"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";

/** RRHH de la Empresa (company_admin) + superadmin HG. Cualquier otro rol:
 * toast + redirect a /home. */
export function CompanyAdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [allowed, setAllowed] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    if (user.role === "company_admin" || user.role === "superadmin") {
      setAllowed(true);
    } else {
      toast("No tenés acceso al panel de empresa.", "danger");
      router.replace("/home");
    }
  }, [user, router]);

  if (!allowed) return null;
  return <>{children}</>;
}
