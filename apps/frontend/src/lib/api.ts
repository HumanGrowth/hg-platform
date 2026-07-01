import axios, { type AxiosInstance } from "axios";

import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import type {
  AdminUser,
  AssessmentPillarCode,
  AssessmentSession,
  AuthResult,
  CareerPath,
  Course,
  CourseDetail,
  NextCourseResponse,
  CourseFilters,
  CourseProgress,
  CourseProgressPayload,
  Enrollment,
  FinalizeResult,
  HomeDashboard,
  InviteInfo,
  ManagerWidgets,
  Me,
  MeWidgets,
  Org,
  OrgMetrics,
  OrgWidgets,
  PaginatedUsers,
  PillarResult,
  SessionKind,
  TeamFilters,
  TeamMemberDetail,
  TeamResponse,
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

export const apiUpdateMe = async (payload: {
  full_name: string;
  job_title?: string | null;
}): Promise<Me> => {
  const res = await backend.patch<Me>("/api/v1/auth/me", payload);
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

export const apiGetCourse = async (slug: string): Promise<CourseDetail> => {
  const res = await backend.get<CourseDetail>(`/api/v1/courses/${slug}`);
  return res.data;
};

export const apiGetNextCourse = async (slug: string): Promise<NextCourseResponse> => {
  const res = await backend.get<NextCourseResponse>(`/api/v1/courses/${slug}/next`);
  return res.data;
};

export const apiSaveProgress = async (
  slug: string,
  payload: CourseProgressPayload,
): Promise<CourseProgress> => {
  const res = await backend.post<CourseProgress>(`/api/v1/courses/${slug}/progress`, payload);
  return res.data;
};

// ─────────────── Manager & RRHH (B4-B) ───────────────

/** Dashboard agregado del colaborador (solo su propia data). */
export const apiGetHomeDashboard = async (): Promise<HomeDashboard> => {
  const res = await backend.get<HomeDashboard>("/api/v1/me/home");
  return res.data;
};

// ─────────────── Widgets dashboard v1 (B4-E) ───────────────

export const apiGetMeWidgets = async (): Promise<MeWidgets> => {
  const res = await backend.get<MeWidgets>("/api/v1/me/widgets");
  return res.data;
};

export const apiGetManagerWidgets = async (): Promise<ManagerWidgets> => {
  const res = await backend.get<ManagerWidgets>("/api/v1/manager/me/widgets");
  return res.data;
};

export const apiGetOrgWidgets = async (orgId?: string): Promise<OrgWidgets> => {
  const res = await backend.get<OrgWidgets>("/api/v1/admin/org/widgets", {
    params: orgId ? { org_id: orgId } : undefined,
  });
  return res.data;
};

export const apiGetMyTeam = async (filters?: TeamFilters): Promise<TeamResponse> => {
  const res = await backend.get<TeamResponse>("/api/v1/manager/me/team", { params: filters });
  return res.data;
};

export const apiGetTeamMemberDetail = async (userId: string): Promise<TeamMemberDetail> => {
  const res = await backend.get<TeamMemberDetail>(`/api/v1/manager/users/${userId}/detail`);
  return res.data;
};

export const apiAssignPath = async (userId: string, pathCode: string): Promise<Enrollment> => {
  const res = await backend.post<Enrollment>(`/api/v1/manager/users/${userId}/enroll`, {
    career_path_code: pathCode,
  });
  return res.data;
};

export const apiUnassignPath = async (userId: string, pathCode: string): Promise<void> => {
  await backend.delete(`/api/v1/manager/users/${userId}/enroll/${pathCode}`);
};

export const apiGetOrgMetrics = async (orgId?: string): Promise<OrgMetrics> => {
  const res = await backend.get<OrgMetrics>("/api/v1/admin/org/metrics", {
    params: orgId ? { org_id: orgId } : undefined,
  });
  return res.data;
};

/**
 * Descarga el CSV de usuarios de la org. El endpoint requiere auth Bearer, así
 * que usamos fetch + blob (no <a download> directo) y disparamos el download.
 */
export const apiExportOrgUsersCsv = async (orgId?: string): Promise<void> => {
  const token = useAuthStore.getState().accessToken;
  const url = `${BACKEND}/api/v1/admin/org/users/export.csv${orgId ? `?org_id=${orgId}` : ""}`;
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new ApiError("export failed", res.status);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = "org-users.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};

// ─────────────── Assessment engine (B2-03) ───────────────

export const apiStartSession = async (payload: {
  kind: SessionKind;
  target_pillar?: AssessmentPillarCode;
}): Promise<AssessmentSession> => {
  const res = await backend.post<AssessmentSession>("/api/v1/assessment/sessions", payload);
  return res.data;
};

export const apiGetSession = async (id: string): Promise<AssessmentSession> => {
  const res = await backend.get<AssessmentSession>(`/api/v1/assessment/sessions/${id}`);
  return res.data;
};

export const apiRespondItem = async (
  sessionId: string,
  payload: {
    item_id: string;
    response_value: number;
    qualitative_text?: string;
    response_time_ms?: number;
  },
): Promise<AssessmentSession> => {
  const res = await backend.post<AssessmentSession>(
    `/api/v1/assessment/sessions/${sessionId}/respond`,
    payload,
  );
  return res.data;
};

export const apiFinalizeSession = async (sessionId: string): Promise<FinalizeResult> => {
  const res = await backend.post<FinalizeResult>(
    `/api/v1/assessment/sessions/${sessionId}/finalize`,
  );
  return res.data;
};

export const apiGetMyResults = async (): Promise<{ results: PillarResult[] }> => {
  const res = await backend.get<{ results: PillarResult[] }>("/api/v1/assessment/me/results");
  return res.data;
};

export const apiConfirmResult = async (pillar: AssessmentPillarCode): Promise<PillarResult> => {
  const res = await backend.post<PillarResult>(
    `/api/v1/assessment/me/results/${pillar}/confirm`,
  );
  return res.data;
};
