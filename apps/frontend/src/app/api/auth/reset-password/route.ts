import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/server-api";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await backendFetch("/api/v1/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token: body.token, password: body.password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ detail: data.detail ?? "reset failed" }, { status: res.status });
  }
  return new NextResponse(null, { status: 204 });
}
