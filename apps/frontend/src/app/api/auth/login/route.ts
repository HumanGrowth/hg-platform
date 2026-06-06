import { NextResponse } from "next/server";

import { backendFetch, setRefreshCookie } from "@/lib/server-api";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await backendFetch("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: body.email,
      password: body.password,
      org_slug: body.orgSlug ?? null,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json({ detail: data.detail ?? "login failed" }, { status: res.status });
  }
  setRefreshCookie(data.refresh_token);
  return NextResponse.json({ user: data.user, accessToken: data.access_token });
}
