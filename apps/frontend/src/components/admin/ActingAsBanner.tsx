"use client";

import { useRouter } from "next/navigation";

import { clearActingOrg, useActingOrg } from "@/lib/acting-org";

/** Banner sticky cuando un superadmin está "viendo como" otra org (AC-01). */
export function ActingAsBanner() {
  const router = useRouter();
  const acting = useActingOrg();
  if (!acting) return null;
  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-warning-bg px-4 py-2 text-sm text-warning">
      <span>
        Viendo como <strong>{acting.name}</strong> (no es tu org real).
      </span>
      <button
        type="button"
        onClick={() => {
          clearActingOrg();
          router.push("/admin/orgs");
        }}
        className="rounded-md border border-warning/40 px-3 py-1 font-semibold hover:bg-warning/10"
      >
        Volver a HG
      </button>
    </div>
  );
}
