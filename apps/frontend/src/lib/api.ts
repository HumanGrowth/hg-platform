import axios, { type AxiosInstance } from "axios";

import { useAuthStore } from "@/lib/auth-store";
import { toast } from "@/lib/toast-store";
import type {
  Perspective,
  PerspectiveContentType,
  PerspectiveInput,
  PerspectiveSummary,
  MyPath,
  SavedTip,
  Area,
  BulkImportResponse,
  Company,
  CompanyAccess,
  CompanyMember,
  CompanyOrg,
  AdminUser,
  AssessmentDimensionCode,
  AssessmentSession,
  AssignableUnit,
  AuthResult,
  BlockProgressOut,
  ModuleAssignment,
  CareerPath,
  CommunityEvent,
  CommunityEventInput,
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
  LearningUnitAttempt,
  LearningUnitDetail,
  LearningUnitFeed,
  LearningUnitFeedItem,
  ManagerWidgets,
  Me,
  MeWidgets,
  MyBadge,
  Org,
  OrgMetrics,
  OrgWidgets,
  PaginatedUsers,
  DimensionProgression,
  DimensionResult,
  QuizSubmitPayload,
  QuizSubmitResponse,
  RadarHistory,
  SessionKind,
  TeamFilters,
  TeamMemberDetail,
  TeamResponse,
  UserMetrics,
  UserRole,
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

export const apiAcceptInvite = (token: string, password: string, usernameOrEmail: string) =>
  postJson<AuthResult>("/api/auth/accept-invite", { token, password, usernameOrEmail });

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
    // Observabilidad en dev: un 422 trae en `detail` qué campo/regla falló
    // (FastAPI). Se loguea solo fuera de producción para diagnosticar payloads
    // sin exponer nada al usuario final.
    if (process.env.NODE_ENV !== "production" && error.response?.status === 422) {
      // eslint-disable-next-line no-console
      console.warn(
        `[api] 422 ${String(original?.method ?? "").toUpperCase()} ${original?.url ?? ""} —`,
        error.response?.data?.detail,
      );
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

/** Marca/resetea el tour de onboarding (Release TASK 6). Devuelve el user actualizado. */
export const apiSetOnboardingSeen = async (seen: boolean): Promise<Me> => {
  const res = await backend.post<Me>("/api/v1/auth/me/onboarding-seen", { seen });
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
  name?: string,
): Promise<{ invite_token: string; invite_url: string; expires_at: string; email: string }> => {
  const body: { email: string; role: string; name?: string } = { email, role };
  if (name && name.trim()) body.name = name.trim();
  const res = await backend.post(`/api/v1/admin/orgs/${orgId}/invite`, body);
  return res.data;
};

/** Sube una imagen (superadmin) → R2. Devuelve la URL pública. */
export const apiUploadImage = async (file: File): Promise<{ url: string }> => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await backend.post<{ url: string }>("/api/v1/admin/upload/image", fd);
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

/** @deprecated TASK lu-refine-B-03 — `/path` usa `apiListModulosByDimension`
 * ahora. Sin callers activos; se deja sin borrar (el endpoint que pega
 * abajo sigue vivo vía el redirect 308 legacy de A-08) por si algún otro
 * lugar necesita listar el catálogo de events heredado por dimensión. */
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
  target_dimension?: AssessmentDimensionCode;
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

export const apiGetMyResults = async (): Promise<{ results: DimensionResult[] }> => {
  const res = await backend.get<{ results: DimensionResult[] }>("/api/v1/assessment/me/results");
  return res.data;
};

export const apiConfirmResult = async (pillar: AssessmentDimensionCode): Promise<DimensionResult> => {
  const res = await backend.post<DimensionResult>(
    `/api/v1/assessment/me/results/${pillar}/confirm`,
  );
  return res.data;
};

/** Catálogo de badges + estado de desbloqueo del usuario (Sprint Tarde · TASK 4). */
export const apiGetMyBadges = async (): Promise<MyBadge[]> => {
  const res = await backend.get<MyBadge[]>("/api/v1/me/badges");
  return res.data;
};

/** Métricas canónicas del usuario (Release TASK 2) — misma fuente que el manager
 * consume en /team/[id], garantizando consistencia cross-role. */
export const apiGetMyMetrics = async (): Promise<UserMetrics> => {
  const res = await backend.get<UserMetrics>("/api/v1/me/metrics");
  return res.data;
};

/** Radar actual + evaluación anterior por dimensión (overlay histórico · TASK 6.3). */
export const apiGetMyRadar = async (): Promise<RadarHistory> => {
  const res = await backend.get<RadarHistory>("/api/v1/assessment/me/radar");
  return res.data;
};

// ─────────────── Eventos de comunidad (Sprint Tarde · TASK 5) ───────────────

export const apiListCommunityEvents = async (): Promise<CommunityEvent[]> => {
  const res = await backend.get<{ items: CommunityEvent[] }>("/api/v1/community-events");
  return res.data.items;
};

export const apiAdminListCommunityEvents = async (): Promise<CommunityEvent[]> => {
  const res = await backend.get<{ items: CommunityEvent[] }>("/api/v1/admin/community-events");
  return res.data.items;
};

export const apiCreateCommunityEvent = async (
  payload: CommunityEventInput,
): Promise<CommunityEvent> => {
  const res = await backend.post<CommunityEvent>("/api/v1/admin/community-events", payload);
  return res.data;
};

export const apiUpdateCommunityEvent = async (
  id: string,
  payload: Partial<CommunityEventInput>,
): Promise<CommunityEvent> => {
  const res = await backend.patch<CommunityEvent>(`/api/v1/admin/community-events/${id}`, payload);
  return res.data;
};

export const apiDeleteCommunityEvent = async (id: string): Promise<void> => {
  await backend.delete(`/api/v1/admin/community-events/${id}`);
};

// ─────────────── Learning Units / Módulos (Fase 1, B-02) ───────────────

export const apiGetModulosFeed = async (): Promise<LearningUnitFeed> => {
  const res = await backend.get<LearningUnitFeed>("/api/v1/modulos/feed");
  return res.data;
};

export const apiGetModulo = async (slug: string): Promise<LearningUnitDetail> => {
  const res = await backend.get<LearningUnitDetail>(`/api/v1/modulos/${slug}`);
  return res.data;
};

/** TASK lu-refine-A-03/B-01 — usado por /path (B-03) para reemplazar el
 * lane de `apiListCoursesForPath` (events) por units reales del pilar. */
export const apiListModulosByDimension = async (
  careerPathCode: string,
  levelCode?: string,
  limit = 10,
): Promise<LearningUnitFeedItem[]> => {
  const res = await backend.get<LearningUnitFeedItem[]>("/api/v1/modulos/by-dimension", {
    params: { dimension_code: careerPathCode, level_code: levelCode, limit },
  });
  return res.data;
};

export const apiStartAttempt = async (slug: string): Promise<LearningUnitAttempt> => {
  const res = await backend.post<LearningUnitAttempt>(`/api/v1/modulos/${slug}/attempts/start`);
  return res.data;
};

export const apiGetAttempt = async (slug: string): Promise<LearningUnitAttempt> => {
  const res = await backend.get<LearningUnitAttempt>(`/api/v1/modulos/${slug}/attempt`);
  return res.data;
};

export const apiCompleteBlock = async (
  slug: string,
  blockId: string,
): Promise<BlockProgressOut> => {
  const res = await backend.post<BlockProgressOut>(
    `/api/v1/modulos/${slug}/blocks/${blockId}/complete`,
  );
  return res.data;
};

export const apiSubmitQuiz = async (
  slug: string,
  blockId: string,
  responses: QuizSubmitPayload[],
): Promise<QuizSubmitResponse> => {
  const res = await backend.post<QuizSubmitResponse>(
    `/api/v1/modulos/${slug}/blocks/${blockId}/quiz/submit`,
    { responses },
  );
  return res.data;
};

export const apiSubmitReflection = async (
  slug: string,
  blockId: string,
  text: string,
): Promise<void> => {
  await backend.post(`/api/v1/modulos/${slug}/blocks/${blockId}/reflection/submit`, { text });
};

// ─────────────────────────── Asignaciones de módulos (TASK 3) ───────────────────────────

export const apiListAssignableUnits = async (): Promise<AssignableUnit[]> => {
  const res = await backend.get<AssignableUnit[]>("/api/v1/admin/assignable-units");
  return res.data;
};

export const apiListUserAssignments = async (userId: string): Promise<ModuleAssignment[]> => {
  const res = await backend.get<ModuleAssignment[]>(`/api/v1/admin/users/${userId}/assignments`);
  return res.data;
};

export const apiAssignModules = async (
  userId: string,
  unitIds: string[],
  dueDate?: string | null,
  note?: string | null,
): Promise<ModuleAssignment[]> => {
  const res = await backend.post<ModuleAssignment[]>(`/api/v1/admin/users/${userId}/assignments`, {
    unit_ids: unitIds,
    due_date: dueDate ?? null,
    note: note ?? null,
  });
  return res.data;
};

export const apiUpdateAssignment = async (
  id: string,
  body: { due_date?: string | null; note?: string | null },
): Promise<ModuleAssignment> => {
  const res = await backend.patch<ModuleAssignment>(`/api/v1/admin/assignments/${id}`, body);
  return res.data;
};

export const apiDeleteAssignment = async (id: string): Promise<void> => {
  await backend.delete(`/api/v1/admin/assignments/${id}`);
};

export const apiMyAssignments = async (): Promise<ModuleAssignment[]> => {
  const res = await backend.get<ModuleAssignment[]>("/api/v1/me/assignments");
  return res.data;
};

/** Mi Ruta — motor de recomendación (TASK 1). */
export const apiGetMyPath = async (): Promise<MyPath> => {
  const res = await backend.get<MyPath>("/api/v1/me/path");
  return res.data;
};

// ─────────────────────────── Plan de Acción · tips (TASK 5) ───────────────────────────

export const apiSaveTip = async (body: {
  tip_text: string;
  source?: "solution" | "reflection" | "custom";
  unit_id?: string | null;
  block_id?: string | null;
  dimension_code?: string | null;
}): Promise<SavedTip> => {
  const res = await backend.post<SavedTip>("/api/v1/me/tips", body);
  return res.data;
};

export const apiListTips = async (dimension?: string, completed?: boolean): Promise<SavedTip[]> => {
  const res = await backend.get<SavedTip[]>("/api/v1/me/tips", {
    params: { dimension: dimension || undefined, completed },
  });
  return res.data;
};

export const apiUpdateTip = async (
  id: string,
  body: { is_completed?: boolean; order_index?: number },
): Promise<SavedTip> => {
  const res = await backend.patch<SavedTip>(`/api/v1/me/tips/${id}`, body);
  return res.data;
};

export const apiDeleteTip = async (id: string): Promise<void> => {
  await backend.delete(`/api/v1/me/tips/${id}`);
};

export const apiAiSummary = async (): Promise<{ enabled: boolean; suggestions: string[]; generated_at: string | null }> => {
  const res = await backend.post("/api/v1/me/plan-accion/ai-summary");
  return res.data;
};

// ─────────────────────────── Perspectivas CMS ───────────────────────────

export const apiListPerspectives = async (params?: {
  content_type?: string;
  dimension?: string;
  q?: string;
  offset?: number;
  limit?: number;
}): Promise<{ items: PerspectiveSummary[]; total: number }> => {
  const res = await backend.get("/api/v1/perspectives", { params });
  return res.data;
};

export const apiGetPerspective = async (slug: string): Promise<Perspective> => {
  const res = await backend.get<Perspective>(`/api/v1/perspectives/${slug}`);
  return res.data;
};

export const apiAdminListPerspectives = async (): Promise<Perspective[]> => {
  const res = await backend.get<Perspective[]>("/api/v1/admin/perspectives");
  return res.data;
};

export const apiAdminGetPerspective = async (id: string): Promise<Perspective> => {
  const res = await backend.get<Perspective>(`/api/v1/admin/perspectives/${id}`);
  return res.data;
};

export const apiCreatePerspective = async (
  content_type: PerspectiveContentType,
  input: PerspectiveInput & { title: string },
): Promise<Perspective> => {
  const res = await backend.post<Perspective>("/api/v1/admin/perspectives", { content_type, ...input });
  return res.data;
};

export const apiUpdatePerspective = async (id: string, input: PerspectiveInput): Promise<Perspective> => {
  const res = await backend.patch<Perspective>(`/api/v1/admin/perspectives/${id}`, input);
  return res.data;
};

export const apiPublishPerspective = async (id: string, publish: boolean): Promise<Perspective> => {
  const res = await backend.post<Perspective>(`/api/v1/admin/perspectives/${id}/${publish ? "publish" : "unpublish"}`);
  return res.data;
};

export const apiDeletePerspective = async (id: string): Promise<void> => {
  await backend.delete(`/api/v1/admin/perspectives/${id}`);
};

// ─────────────────────────── Consentimiento de privacidad (Capa Empresa · TASK 5) ───────────────────────────

/** Consentimiento granular (docx v1.0). null=pendiente, true=autorizó, false=declinó/revocó. */
export interface ConsentStatus {
  consent_manager: boolean | null;
  consent_hr: boolean | null;
  updated_at: string | null;
}

export const apiGetConsent = async (): Promise<ConsentStatus> => {
  const res = await backend.get<ConsentStatus>("/api/v1/me/consent");
  return res.data;
};

/** Setea ambos scopes (aceptar / "Ahora no"=ambos false / revocar). */
export const apiSetConsent = async (
  consentManager: boolean,
  consentHr: boolean,
): Promise<ConsentStatus> => {
  const res = await backend.post<ConsentStatus>("/api/v1/me/consent", {
    consent_manager: consentManager,
    consent_hr: consentHr,
  });
  return res.data;
};

// ─────────────────────────── Capa Empresa · RRHH (company_admin + superadmin) ───────────────────────────

export const apiCompanyOrgs = async (companyId?: string): Promise<CompanyOrg[]> => {
  const res = await backend.get<CompanyOrg[]>("/api/v1/company/organizations", {
    params: companyId ? { company_id: companyId } : undefined,
  });
  return res.data;
};

export const apiCreateCompanyOrg = async (
  body: { name: string; slug: string; tier?: string; country?: string | null; licenses_total?: number | null },
  companyId?: string,
): Promise<CompanyOrg> => {
  const res = await backend.post<CompanyOrg>("/api/v1/company/organizations", body, {
    params: companyId ? { company_id: companyId } : undefined,
  });
  return res.data;
};

export const apiCompanyMembers = async (companyId?: string): Promise<CompanyMember[]> => {
  const res = await backend.get<CompanyMember[]>("/api/v1/company/members", {
    params: companyId ? { company_id: companyId } : undefined,
  });
  return res.data;
};

export const apiCompanyInvite = async (
  orgId: string,
  body: { email: string; role?: string; name?: string },
  companyId?: string,
): Promise<{ invitation_id: string; email: string; role: UserRole; invite_url: string; expires_at: string }> => {
  const res = await backend.post(`/api/v1/company/organizations/${orgId}/invite`, body, {
    params: companyId ? { company_id: companyId } : undefined,
  });
  return res.data;
};

export const apiUpdateCompanyMember = async (
  userId: string,
  body: { org_id?: string | null; manager_id?: string | null; is_active?: boolean | null },
  companyId?: string,
): Promise<Me> => {
  const res = await backend.patch<Me>(`/api/v1/company/members/${userId}`, body, {
    params: companyId ? { company_id: companyId } : undefined,
  });
  return res.data;
};

/** Descarga la plantilla .xlsx de bulk import (blob). */
export const apiBulkImportTemplate = async (): Promise<Blob> => {
  const res = await backend.get("/api/v1/company/members/bulk-import/template", {
    responseType: "blob",
  });
  return res.data as Blob;
};

export const apiBulkImport = async (file: File, companyId?: string): Promise<BulkImportResponse> => {
  const fd = new FormData();
  fd.append("file", file);
  const res = await backend.post<BulkImportResponse>("/api/v1/company/members/bulk-import", fd, {
    params: companyId ? { company_id: companyId } : undefined,
  });
  return res.data;
};

// ─────────────────────────── Capa Empresa · superadmin (companies + áreas) ───────────────────────────

export const apiListCompanies = async (): Promise<Company[]> => {
  const res = await backend.get<Company[]>("/api/v1/admin/companies");
  return res.data;
};

export const apiCreateCompany = async (body: {
  name: string;
  slug: string;
  tier?: string;
  licenses_total?: number;
  billing_status?: string;
}): Promise<Company> => {
  const res = await backend.post<Company>("/api/v1/admin/companies", body);
  return res.data;
};

export const apiListAreas = async (): Promise<Area[]> => {
  const res = await backend.get<Area[]>("/api/v1/admin/areas");
  return res.data;
};

export const apiCreateArea = async (body: {
  code: string;
  name: string;
  description?: string | null;
}): Promise<Area> => {
  const res = await backend.post<Area>("/api/v1/admin/areas", body);
  return res.data;
};

export const apiUpdateArea = async (
  code: string,
  body: { name?: string; description?: string | null; is_active?: boolean },
): Promise<Area> => {
  const res = await backend.patch<Area>(`/api/v1/admin/areas/${code}`, body);
  return res.data;
};

export const apiGetCompanyAccess = async (companyId: string): Promise<CompanyAccess> => {
  const res = await backend.get<CompanyAccess>(`/api/v1/admin/companies/${companyId}/access`);
  return res.data;
};

export const apiSetCompanyAccess = async (
  companyId: string,
  areaCodes: string[],
): Promise<CompanyAccess> => {
  const res = await backend.put<CompanyAccess>(`/api/v1/admin/companies/${companyId}/access`, {
    area_codes: areaCodes,
  });
  return res.data;
};

// ─────────────────────────── Progresión por dimensión (TASK 6) ───────────────────────────

/** Progreso por dimensión: nivel actual + completion 0-100 (aprendizaje+assessment). */
export const apiGetProgression = async (): Promise<DimensionProgression[]> => {
  const res = await backend.get<DimensionProgression[]>("/api/v1/me/progression");
  return res.data;
};
