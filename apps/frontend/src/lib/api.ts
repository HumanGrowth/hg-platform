import axios, { type AxiosInstance } from "axios";

import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import type {
  AdminUser,
  AuthResult,
  CareerPath,
  Course,
  CourseFilters,
  InviteInfo,
  Me,
  Org,
  PaginatedUsers,
} from "@/lib/types";

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
        // Refresh falló (token revocado/expirado o backend caído): terminar la
        // sesión con feedback y un redirect duro a /login (full reload limpia
        // el estado en memoria de Zustand). Cierra ISSUE-1 (ver FU-03).
        useAuthStore.getState().clear();
        // Toast best-effort en la página actual + redirect duro con ?reason para
        // que /login lo vuelva a mostrar tras el full reload (que limpia Zustand).
        toast("Sesión expirada — iniciá sesión otra vez.", "danger");
        if (typeof window !== "undefined") {
          window.location.href = "/login?reason=expired";
        }
      }
    }
    return Promise.reject(error);
  },
);

export const apiMe = async (): Promise<Me> => {
  const res = await backend.get<Me>("/api/v1/auth/me");
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

export const apiListOrgUsers = async (
  orgId: string,
  params?: { status?: string; role?: string; page?: number; page_size?: number },
): Promise<PaginatedUsers> => {
  const res = await backend.get(`/api/v1/admin/orgs/${orgId}/users`, { params });
  return res.data as PaginatedUsers;
};

export const apiUpdateUser = async (
  userId: string,
  payload: Partial<Pick<AdminUser, "is_active" | "role" | "manager_id" | "career_level">>,
): Promise<AdminUser> => {
  const res = await backend.patch(`/api/v1/admin/users/${userId}`, payload);
  return res.data as AdminUser;
};

// ─────────────── Marketing (público, sin auth) ───────────────

export interface ContactInquiryPayload {
  name: string;
  email: string;
  company?: string;
  role?: string;
  message?: string;
  source?: string;
}

/** Lead del sitio público: POST directo al backend (endpoint sin auth). */
export const apiSubmitInquiry = async (payload: ContactInquiryPayload): Promise<void> => {
  const res = await fetch(`${BACKEND}/api/v1/contact/inquiry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(data?.detail ?? "request failed", res.status);
  }
};

// ─────────────── Catálogo PMM (paths + courses, auth Bearer) ───────────────

export const apiListPaths = async (): Promise<CareerPath[]> => {
  const res = await backend.get<CareerPath[]>("/api/v1/paths");
  return res.data;
};

export const apiListCourses = async (
  filters?: CourseFilters,
): Promise<{ items: Course[]; total: number }> => {
  const res = await backend.get("/api/v1/courses", { params: filters });
  return res.data as { items: Course[]; total: number };
};

export const apiListCoursesForPath = async (
  pathCode: string,
  filters?: Omit<CourseFilters, "track">,
): Promise<{ items: Course[]; total: number }> => {
  const res = await backend.get(`/api/v1/paths/${pathCode}/courses`, { params: filters });
  return res.data as { items: Course[]; total: number };
};
