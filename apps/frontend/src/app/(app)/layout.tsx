import { BetaBanner } from "@/components/BetaBanner";
import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";
import { SessionGate } from "@/components/SessionGate";

// App shell: SideNav (desktop) + TopBar + BottomNav (mobile). SessionGate
// rehidrata el token y gatea: la nav/children sólo se montan con sesión válida.
// Layout de altura fija: solo el <main> interno scrollea (ni body ni html).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <BetaBanner />
      <SessionGate requireOnboarding>
        <div className="flex min-h-0 flex-1">
          <SideNav className="hidden md:flex" />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children}</main>
            <BottomNav className="md:hidden" />
          </div>
        </div>
      </SessionGate>
    </div>
  );
}
