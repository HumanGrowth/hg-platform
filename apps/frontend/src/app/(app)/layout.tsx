import { BetaBanner } from "@/components/BetaBanner";
import { AppShell } from "@/components/nav/AppShell";
import { SessionGate } from "@/components/SessionGate";

// App shell: classic (SideNav + TopBar + BottomNav) o glass (SpatialCanvas) —
// ver AppShell.tsx. SessionGate rehidrata el token y gatea: la nav/children
// sólo se montan con sesión válida. Layout de altura fija: solo el <main>
// interno scrollea (ni body ni html).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BetaBanner />
      <SessionGate requireOnboarding>
        <AppShell>{children}</AppShell>
      </SessionGate>
    </div>
  );
}
