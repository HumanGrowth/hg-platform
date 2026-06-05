export type UserRole = "superadmin" | "admin" | "manager" | "collaborator";
export type CareerLevel = "L1" | "L2" | "L3" | "L4a" | "L4b";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  org_id: string;
  career_level: CareerLevel | null;
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

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
}
