import { NextResponse } from "next/server";

import { backendFetch, setRefreshCookie } from "@/lib/server-api";

export async function POST(req: Request) {
  const body = await req.json();
  const res = await backendFetch("/api/v1/auth/accept-invite", {
    method: "POST",
    body: JSON.stringify({
      token: body.token,
      password: body.password,
      full_name: body.fullName,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { detail: data.detail ?? "accept failed" },
      { status: res.status },
    );
  }
  setRefreshCookie(data.refresh_token);
  return NextResponse.json({ user: data.user, accessToken: data.access_token });
}
