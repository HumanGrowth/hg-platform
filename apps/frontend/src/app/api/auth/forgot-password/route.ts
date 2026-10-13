import { NextResponse } from "next/server";

import { backendFetch } from "@/lib/server-api";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await backendFetch("/api/v1/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: body.email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ detail: data.detail ?? "request failed" }, { status: res.status });
  }
  return NextResponse.json({ status: "ok" }, { status: 202 });
}
