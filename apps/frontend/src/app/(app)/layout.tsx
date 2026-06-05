import { BetaBanner } from "@/components/BetaBanner";

// App shell — el top nav completo se agrega en FE-04. El BetaBanner vive acá
// (grupo (app)) y NO en (auth), por decisión de DEC-03 pendiente.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <BetaBanner />
      {children}
    </div>
  );
}
