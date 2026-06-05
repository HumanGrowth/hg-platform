/**
 * Helpers server-side (Next API routes) para hablar con el backend.
 * El refresh token vive sólo en una cookie httpOnly gestionada acá.
 */
import { cookies } from "next/headers";

export const REFRESH_COOKIE = "hg_refresh";

/** Base URL del backend desde el servidor (docker: http://backend:8000). */
export function backendBase(): string {
  return (
    process.env.API_BASE_URL_INTERNAL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    "http://localhost:8000"
  );
}

export async function backendFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${backendBase()}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
}

export function setRefreshCookie(token: string): void {
  cookies().set(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14, // 14 días, alineado al refresh TTL del backend
  });
}

export function clearRefreshCookie(): void {
  cookies().delete(REFRESH_COOKIE);
}

export function getRefreshCookie(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}
