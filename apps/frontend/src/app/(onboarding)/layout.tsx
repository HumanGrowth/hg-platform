import { SessionGate } from "@/components/SessionGate";

// Onboarding cinematográfico: full-screen, sin Nav ni sidebar. Requiere sesión
// (es post-login) pero no exige onboarding completo (evita loop de redirect).
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionGate>
      <div className="flex min-h-screen flex-col bg-surface-page">{children}</div>
    </SessionGate>
  );
}
