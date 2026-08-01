import { create } from "zustand";

import type { User } from "@/lib/types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** true hasta que el primer intento de refresh-on-load resuelve. */
  hydrating: boolean;
  setSession: (user: User, accessToken: string) => void;
  /** Actualiza sólo el user (p.ej. tras marcar el onboarding como visto). */
  setUser: (user: User) => void;
  setHydrated: () => void;
  clear: () => void;
}

/**
 * Estado de auth en memoria. El access token NUNCA va a localStorage (sólo
 * memoria); el refresh token vive en una cookie httpOnly server-side.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  hydrating: true,
  setSession: (user, accessToken) => set({ user, accessToken, hydrating: false }),
  setUser: (user) => set({ user }),
  setHydrated: () => set({ hydrating: false }),
  clear: () => set({ user: null, accessToken: null, hydrating: false }),
}));
