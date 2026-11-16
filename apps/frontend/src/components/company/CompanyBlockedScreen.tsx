"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Display } from "@/components/ui/display";
import { Eyebrow } from "@/components/ui/eyebrow";
import { getCopy, type Lang } from "@/lib/i18n";

/** Pantalla cuando la empresa está suspendida/terminada (ADR-0016). Mismo texto
 * para ambos estados: la persona no necesita saber cuál es, solo a quién escribir. */
export function CompanyBlockedScreen({
  onLogout,
  lang = "es",
}: {
  onLogout: () => void | Promise<void>;
  lang?: Lang;
}) {
  const c = getCopy(lang).companyLifecycle.blocked;
  return (
    <Card className="p-8 md:p-10" role="alert">
      <Eyebrow accent className="mb-2">
        Human Growth
      </Eyebrow>
      <Display variant="display-3" className="mb-4">
        {c.title}
      </Display>
      <p className="mb-6 font-sans text-base text-fg-muted">{c.message}</p>
      <Button variant="secondary" onClick={() => void onLogout()}>
        {c.logout}
      </Button>
    </Card>
  );
}
