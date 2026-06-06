import { BetaBanner } from "@/components/BetaBanner";
import { SessionGate } from "@/components/SessionGate";
import { TopNav } from "@/components/TopNav";

// App shell: BetaBanner (sólo en (app), no en (auth)) + top nav glass-on-scroll.
// SessionGate rehidrata el access token y gatea: TopNav/children sólo se montan
// con sesión válida (y user disponible).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <SessionGate>
        <TopNav />
        <div className="flex-1">{children}</div>
      </SessionGate>
    </div>
  );
}
