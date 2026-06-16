import { BetaBanner } from "@/components/BetaBanner";
import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { TopBar } from "@/components/nav/TopBar";
import { SessionGate } from "@/components/SessionGate";

// App shell: SideNav (desktop) + TopBar + BottomNav (mobile). SessionGate
// rehidrata el token y gatea: la nav/children sólo se montan con sesión válida.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <SessionGate requireOnboarding>
        <div className="flex h-screen">
          <SideNav className="hidden md:flex" />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <main className="flex-1 overflow-auto pb-20 md:pb-0">{children}</main>
            <BottomNav className="md:hidden" />
          </div>
        </div>
      </SessionGate>
    </div>
  );
}
