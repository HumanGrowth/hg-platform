import { BetaBanner } from "@/components/BetaBanner";
import { SessionGate } from "@/components/SessionGate";

// App shell. El top nav completo se agrega en FE-04. El BetaBanner vive acá
// (grupo (app)) y NO en (auth). SessionGate rehidrata el access token y gatea.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      <SessionGate>{children}</SessionGate>
    </div>
  );
}
