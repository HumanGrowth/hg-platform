export type UserRole = "superadmin" | "admin" | "manager" | "collaborator";
export type CareerLevel = "L1" | "L2" | "L3" | "L4a" | "L4b";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  org_id: string;
  career_level: CareerLevel | null;
  /** Lo provee el backend cuando el motor de assessment exista (B2-02/B2-03).
   * Si viene `false`, el SessionGate manda al onboarding. `undefined` = no
   * forzar (usuarios actuales no se ven afectados). */
  has_completed_onboarding?: boolean;
}

/** /api/v1/auth/me = User + org_name. */
export interface Me extends User {
  org_name: string;
}

/** Lo que las API routes de Next devuelven al cliente (sin refresh token). */
export interface AuthResult {
  user: User;
  accessToken: string;
}

export interface InviteInfo {
  email: string;
  role: UserRole;
  org_name: string;
  status: "pending" | "accepted" | "revoked" | "expired";
}

export interface Org {
  id: string;
  name: string;
  slug: string;
  tier: "A" | "B" | "C";
  country: string | null;
  billing_status: string;
  billing_cycle: string | null;
  licenses_total: number;
  licenses_used: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  career_level: CareerLevel | null;
  is_active: boolean;
  last_login_at: string | null;
  last_active_at: string | null;
  manager_id: string | null;
  created_at: string;
}

export interface PaginatedUsers {
  items: AdminUser[];
  total: number;
  page: number;
  page_size: number;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// ─────────────── Catálogo PMM (B2-06 / B2-09) ───────────────
// Nota: `CourseLevel` (L1..L6 del catálogo PMM) es distinto del `CareerLevel`
// del usuario (L1..L4b), para no colisionar con el enum de identity.

export interface CareerPath {
  id: string;
  code: "P1" | "P2" | "P3" | "P4" | "P5" | "P6";
  name: string;
  description: string | null;
  order_index: number;
}

export type CourseLevel = "L1" | "L2" | "L3" | "L4" | "L5" | "L6";
export type CompetencyCode = "C1" | "C2" | "C3" | "C4" | "C5";
export type CourseTrack =
  | "competency"
  | "foundation_ai"
  | "foundation_eth"
  | "foundation_specifics";

export interface Course {
  id: string;
  career_path_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  hls_master_url: string | null;
  duration_seconds: number;
  career_level: CourseLevel;
  competency_code: CompetencyCode | null;
  track: CourseTrack;
  is_active: boolean;
}

export interface CourseFilters {
  level?: CourseLevel;
  competency?: CompetencyCode;
  track?: CourseTrack;
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CourseProgress {
  last_position_seconds: number;
  watch_pct: number;
  is_completed: boolean;
  completed_at: string | null;
}

export interface CourseDetail extends Course {
  progress: CourseProgress | null;
}

export interface CourseProgressPayload {
  position_seconds: number;
  watch_pct: number;
}
