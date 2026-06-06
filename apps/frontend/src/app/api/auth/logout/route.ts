import { NextResponse } from "next/server";

import { backendFetch, clearRefreshCookie, getRefreshCookie } from "@/lib/server-api";

export async function POST() {
  const refresh = getRefreshCookie();
  if (refresh) {
    // Best-effort: revoca la sesión en backend; nunca bloquea el logout local.
    try {
      await backendFetch("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refresh }),
      });
    } catch {
      // ignore
    }
  }
  clearRefreshCookie();
  return new NextResponse(null, { status: 204 });
}
