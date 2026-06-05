import axios, { type AxiosInstance } from "axios";

import { useAuthStore } from "@/lib/auth-store";
import type { AuthResult, InviteInfo, Org, User } from "@/lib/types";

const BACKEND = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** Llama a una API route de Next (gestiona la cookie httpOnly del refresh). */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = res.status === 204 ? null : await res.json();
  if (!res.ok) {
    throw new ApiError(data?.detail ?? "request failed", res.status);
  }
  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ─────────────── Session ops (vía Next API routes + cookie) ───────────────

export const apiLogin = (email: string, password: string, orgSlug?: string) =>
  postJson<AuthResult>("/api/auth/login", { email, password, orgSlug });

export const apiAcceptInvite = (token: string, password: string, fullName: string) =>
  postJson<AuthResult>("/api/auth/accept-invite", { token, password, fullName });

/** Rehidrata el access token desde la cookie httpOnly (no recibe el refresh). */
export const apiRefresh = () => postJson<AuthResult>("/api/auth/refresh", {});

export const apiLogout = () => postJson<null>("/api/auth/logout", {});

// ─────────────── Backend-direct (Bearer en memoria) ───────────────

/** Instancia axios contra el backend; inyecta el access token y auto-refresca 1 vez en 401. */
export const backend: AxiosInstance = axios.create({ baseURL: BACKEND, timeout: 15000 });

backend.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

backend.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as (typeof error.config & { _retried?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      try {
        const session = await apiRefresh();
        useAuthStore.getState().setSession(session.user, session.accessToken);
        original.headers = { ...original.headers, Authorization: `Bearer ${session.accessToken}` };
        return backend(original);
      } catch {
        useAuthStore.getState().clear();
      }
    }
    return Promise.reject(error);
  },
);

export const apiMe = async (): Promise<User> => {
  const res = await backend.get<User>("/api/v1/auth/me");
  return res.data;
};

export const apiInviteInfo = async (token: string): Promise<InviteInfo> => {
  const res = await axios.get<InviteInfo>(`${BACKEND}/api/v1/auth/invite-info`, {
    params: { token },
  });
  return res.data;
};

// ─────────────── Admin ───────────────

export const apiListOrgs = async (): Promise<{ items: Org[]; total: number }> => {
  const res = await backend.get("/api/v1/admin/orgs");
  return res.data;
};

export const apiCreateOrg = async (payload: Record<string, unknown>): Promise<Org> => {
  const res = await backend.post("/api/v1/admin/orgs", payload);
  return res.data;
};

export const apiCreateInvite = async (
  orgId: string,
  email: string,
  role: string,
): Promise<{ invite_token: string; invite_url: string; expires_at: string; email: string }> => {
  const res = await backend.post(`/api/v1/admin/orgs/${orgId}/invite`, { email, role });
  return res.data;
};

export const apiListInvites = async (orgId: string, status?: string) => {
  const res = await backend.get(`/api/v1/admin/orgs/${orgId}/invitations`, {
    params: status ? { status } : undefined,
  });
  return res.data;
};

export const apiRevokeInvite = async (invitationId: string): Promise<void> => {
  await backend.delete(`/api/v1/admin/invitations/${invitationId}`);
};
