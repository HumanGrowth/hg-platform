import { NextResponse } from "next/server";

import {
  backendFetch,
  clearRefreshCookie,
  getRefreshCookie,
  setRefreshCookie,
} from "@/lib/server-api";

export async function POST() {
  const refresh = getRefreshCookie();
  if (!refresh) {
    return NextResponse.json({ detail: "no session" }, { status: 401 });
  }
  const res = await backendFetch("/api/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refresh }),
  });
  const data = await res.json();
  if (!res.ok) {
    clearRefreshCookie();
    return NextResponse.json({ detail: data.detail ?? "refresh failed" }, { status: 401 });
  }
  setRefreshCookie(data.refresh_token); // rotación
  return NextResponse.json({ user: data.user, accessToken: data.access_token });
}
